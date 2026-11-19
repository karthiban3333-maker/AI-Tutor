import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { tutorChat, evaluateAnswer, generateFlashcards } from '../lib/gemini';
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, query, orderBy, getDocs, arrayUnion } from 'firebase/firestore';
import { Send, Loader2, ArrowLeft, CheckCircle, Award } from 'lucide-react';

export default function Chat() {
    const { moduleId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const endOfMessagesRef = useRef(null);

    const [moduleData, setModuleData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [error, setError] = useState('');
    const [socraticMode, setSocraticMode] = useState(false);

    useEffect(() => {
        async function fetchModuleAndChats() {
            if (!currentUser || !moduleId) return;
            try {
                const modRef = doc(db, "modules", moduleId);
                const modSnap = await getDoc(modRef);

                if (!modSnap.exists() || modSnap.data().userId !== currentUser.uid) {
                    setError("Module not found or access denied.");
                    setLoading(false);
                    return;
                }

                setModuleData(modSnap.data());

                const q = query(collection(db, `modules/${moduleId}/chats`), orderBy("timestamp", "asc"));
                const chatSnap = await getDocs(q);
                const loadedMessages = chatSnap.docs.map(d => d.data());

                setMessages(loadedMessages);

                // Fetch Socratic Mode default
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setSocraticMode(userSnap.data().socraticMode || false);
                }

            } catch (err) {
                setError(err.message || "Failed to load chat.");
            } finally {
                setLoading(false);
            }
        }

        fetchModuleAndChats();
    }, [currentUser, moduleId]);

    const handleToggleSocratic = async () => {
        const newValue = !socraticMode;
        setSocraticMode(newValue);
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await setDoc(userRef, { socraticMode: newValue }, { merge: true });
        } catch (err) {
            console.error("Failed to update socratic preference", err);
        }
    };

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || sending) return;

        const userMessage = input.trim();
        setInput('');
        setSending(true);

        // Optimistic UI
        const newUserMsg = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, newUserMsg]);

        try {
            // Save user message
            await addDoc(collection(db, `modules/${moduleId}/chats`), newUserMsg);

            const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
            const tutorResponse = await tutorChat(moduleData.content, userMessage, chatHistory, socraticMode);

            // Parse checkpoint evaluation if present
            const evalRegex = /\[CHECKPOINT_EVAL:\s*(CORRECT|INCORRECT)(?:\s+Concept:\s*(.*?))?\]/i;
            const match = tutorResponse.match(evalRegex);
            let isIncorrect = false;
            let struggledConcept = null;

            if (match) {
                const status = match[1].toUpperCase();
                if (status === 'INCORRECT') {
                    isIncorrect = true;
                    struggledConcept = match[2] ? match[2].trim() : 'General Understanding';
                }
            }

            // Clean evaluation tag from response text
            const cleanTutorResponse = tutorResponse.replace(evalRegex, '').trim();

            if (isIncorrect && struggledConcept) {
                try {
                    const modRef = doc(db, "modules", moduleId);
                    await updateDoc(modRef, {
                        struggledConcepts: arrayUnion(struggledConcept)
                    });
                } catch (dbErr) {
                    console.error("Failed to save struggled concept", dbErr);
                }
            }

            const newAiMsg = { role: 'assistant', content: cleanTutorResponse, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, newAiMsg]);
            await addDoc(collection(db, `modules/${moduleId}/chats`), newAiMsg);

        } catch (err) {
            setError(err.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };


    const handleEvaluate = async () => {
        if (messages.length < 2) return;
        setEvaluating(true);
        setError('');

        try {
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
            const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || 'Did you understand the topic?';

            const evaluation = await evaluateAnswer(moduleData.content, lastAiMsg, lastUserMsg);
            const score = evaluation.score || 0;
            const feedback = evaluation.feedback || "Good job!";

            // Update Module
            await updateDoc(doc(db, "modules", moduleId), {
                completed: true,
                progress: score * 10
            });

            // Update Streak Logic
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : { streak: 1, lastActiveDate: null };

            const today = new Date(); today.setHours(0, 0, 0, 0);
            let newStreak = userData.streak || 1;

            if (userData.lastActiveDate) {
                const lastActive = new Date(userData.lastActiveDate);
                lastActive.setHours(0, 0, 0, 0);
                const diffDays = Math.round(Math.abs((today - lastActive) / (1000 * 60 * 60 * 24)));

                if (diffDays === 1) {
                    newStreak += 1;
                } else if (diffDays > 1) {
                    newStreak = 1;
                }
            }

            await setDoc(userRef, {
                streak: newStreak,
                lastActiveDate: new Date().toISOString()
            }, { merge: true });

            // Generate Flashcards from struggled concepts
            try {
                const freshModSnap = await getDoc(doc(db, "modules", moduleId));
                const freshModData = freshModSnap.exists() ? freshModSnap.data() : {};
                const struggledConcepts = freshModData.struggledConcepts || [];

                const flashcards = await generateFlashcards(moduleData.content, struggledConcepts, feedback);

                if (Array.isArray(flashcards) && flashcards.length > 0) {
                    const now = new Date();
                    const flashcardPromises = flashcards.map(card =>
                        addDoc(collection(db, "flashcards"), {
                            userId: currentUser.uid,
                            moduleId,
                            topic: moduleData.topic || 'General',
                            front: card.front,
                            back: card.back,
                            interval: 0,
                            nextReviewDate: now.toISOString(), // Available immediately
                            createdAt: now.toISOString()
                        })
                    );
                    await Promise.all(flashcardPromises);
                }
            } catch (flashErr) {
                console.error("Flashcard generation failed (non-blocking):", flashErr);
            }

            // Navigate back to home or show feedback modal
            alert(`Session Completed! Score: ${score}/10. ${feedback}\nStreak: ${newStreak} 🔥\n\nFlashcards generated — check the Review tab to study them!`);
            navigate('/');

        } catch (err) {
            setError(err.message || "Failed to evaluate session.");
        } finally {
            setEvaluating(false);
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><Loader2 className="animate-spin" size={32} /></div>;
    }

    if (error || !moduleData) {
        return <div style={{ color: 'var(--danger-color)', padding: '2rem' }}>{error || "Module not found."}</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>

            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/')} className="btn-secondary" style={{ padding: '0.5rem' }}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600, textTransform: 'uppercase' }}>
                            {moduleData.topic || "AI Tutoring Session"}
                        </div>
                        <h1 style={{ fontSize: '1.5rem' }}>{moduleData.title}</h1>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid var(--border-color)' }}>
                        <input
                            type="checkbox"
                            id="socratic-toggle"
                            checked={socraticMode}
                            onChange={handleToggleSocratic}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                        />
                        <label htmlFor="socratic-toggle" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                            Socratic Mode
                        </label>
                    </div>

                    {messages.length > 1 && !moduleData.completed && (
                        <button onClick={handleEvaluate} disabled={evaluating} className="btn-primary" style={{ background: 'var(--success-color)' }}>
                            {evaluating ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                            Finish & Evaluate
                        </button>
                    )}

                    {moduleData.completed && (
                        <div className="badge badge-success" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                            <Award size={18} style={{ marginRight: '0.5rem' }} />
                            Completed: {moduleData.progress}% Score
                        </div>
                    )}
                </div>

            </header>

            <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>

                {/* Module Context */}
                <section className="glass-panel" style={{ width: '30%', minWidth: '250px', padding: '1.5rem', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Module Context</h3>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{moduleData.content}</p>
                </section>

                {/* Chat Area */}
                <section className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {messages.length === 0 && (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <p>Say hello to your AI tutor to start learning!</p>
                            </div>
                        )}

                        {messages.map((msg, i) => {
                            const isUser = msg.role === 'user';
                            const isCheckpoint = !isUser && msg.content.includes('[CHECKPOINT]');
                            const displayContent = isCheckpoint ? msg.content.replace('[CHECKPOINT]', '').trim() : msg.content;
                            
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                        maxWidth: '80%',
                                        padding: '1rem 1.25rem',
                                        borderRadius: '16px',
                                        background: isUser 
                                            ? 'linear-gradient(135deg, var(--primary-color), #8b5cf6)' 
                                            : isCheckpoint 
                                                ? 'rgba(99, 102, 241, 0.05)' 
                                                : 'var(--surface-hover)',
                                        border: isUser 
                                            ? 'none' 
                                            : isCheckpoint 
                                                ? '2px solid rgba(139, 92, 246, 0.4)' 
                                                : '1px solid var(--border-color)',
                                        boxShadow: isUser 
                                            ? '0 4px 12px rgba(99, 102, 241, 0.3)' 
                                            : isCheckpoint 
                                                ? '0 0 15px rgba(139, 92, 246, 0.15)' 
                                                : 'none',
                                        color: isUser ? '#fff' : 'var(--text-primary)',
                                        borderBottomRightRadius: isUser ? '4px' : '16px',
                                        borderBottomLeftRadius: isUser ? '16px' : '4px',
                                        fontSize: '0.95rem',
                                        position: 'relative'
                                    }}>
                                        {isCheckpoint && (
                                            <div style={{ 
                                                fontSize: '0.7rem', 
                                                color: '#a78bfa', 
                                                fontWeight: 700, 
                                                textTransform: 'uppercase', 
                                                letterSpacing: '0.05em', 
                                                marginBottom: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}>
                                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 8px #a78bfa' }}></span>
                                                Comprehension Check
                                            </div>
                                        )}
                                        {displayContent}
                                    </div>
                                </div>
                            );
                        })}

                        {sending && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{ padding: '1rem 1.25rem', borderRadius: '16px', background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderBottomLeftRadius: '4px' }}>
                                    <Loader2 className="animate-spin" size={16} />
                                </div>
                            </div>
                        )}

                        <div ref={endOfMessagesRef} />
                    </div>

                    <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question or answer the tutor..."
                                className="input-field"
                                style={{ flex: 1, borderRadius: '99px', padding: '0.875rem 1.5rem' }}
                                disabled={sending || moduleData.completed}
                            />
                            <button
                                type="submit"
                                className="btn-primary"
                                style={{ borderRadius: '99px', aspectRatio: '1', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                disabled={!input.trim() || sending || moduleData.completed}
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>

                </section>

            </div>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}
