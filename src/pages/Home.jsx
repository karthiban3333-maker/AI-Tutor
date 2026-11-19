import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { generateModules } from '../lib/gemini';
import { collection, query, where, getDocs, addDoc, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { FileText, Loader2, PlayCircle, PlusCircle, CheckCircle, Trash2, GraduationCap, UploadCloud } from 'lucide-react';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Point pdfjs to CDN worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs';


export default function Home() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    // Multimodal input states
    const [uploadedFile, setUploadedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileData, setFileData] = useState(null);
    const [fileLoading, setFileLoading] = useState(false);

    const extractTextFromPDF = async (arrayBuffer) => {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullText += pageText + "\n";
        }
        return fullText;
    };

    const extractTextFromPPTX = async (arrayBuffer) => {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const parser = new DOMParser();
        const namespace = "http://schemas.openxmlformats.org/drawingml/2006/main";
        let fullText = "";

        let i = 1;
        while (true) {
            const slideFile = zip.file(`ppt/slides/slide${i}.xml`);
            if (!slideFile) break;

            const xmlStr = await slideFile.async('text');
            const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
            const textNodes = xmlDoc.getElementsByTagNameNS(namespace, 't');
            
            let slideText = "";
            for (let node of textNodes) {
                slideText += node.textContent + " ";
            }
            if (slideText.trim()) {
                fullText += `--- Slide ${i} ---\n${slideText}\n\n`;
            }
            i++;
        }
        
        if (!fullText) {
            throw new Error("Could not extract any text from PowerPoint file. Make sure it contains text shapes.");
        }
        return fullText;
    };

    const processFile = async (file) => {
        setError('');
        setFileLoading(true);
        setUploadedFile(file);
        setFilePreview(null);
        setFileData(null);

        const fileType = file.type;
        const fileName = file.name.toLowerCase();

        try {
            if (fileType.startsWith('image/')) {
                // Read image as base64
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result;
                    setFilePreview(result);
                    // Extract the base64 part
                    const base64Data = result.split(',')[1];
                    setFileData({
                        base64: base64Data,
                        mimeType: fileType
                    });
                    setFileLoading(false);
                };
                reader.onerror = () => {
                    throw new Error("Failed to read image file.");
                };
                reader.readAsDataURL(file);
            } else if (fileName.endsWith('.pdf')) {
                // Parse PDF client-side
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        const arrayBuffer = reader.result;
                        const text = await extractTextFromPDF(arrayBuffer);
                        setContent(text);
                        setFileLoading(false);
                    } catch (err) {
                        console.error("PDF Parsing error", err);
                        setError("Failed to extract text from PDF. Ensure it contains readable text.");
                        setFileLoading(false);
                        setUploadedFile(null);
                    }
                };
                reader.readAsArrayBuffer(file);
            } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
                // Parse PPTX client-side
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        const arrayBuffer = reader.result;
                        const text = await extractTextFromPPTX(arrayBuffer);
                        setContent(text);
                        setFileLoading(false);
                    } catch (err) {
                        console.error("PPTX Parsing error", err);
                        setError(err.message || "Failed to extract text from PPT/PPTX.");
                        setFileLoading(false);
                        setUploadedFile(null);
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                throw new Error("Unsupported file type. Please upload an image, PDF, or PowerPoint presentation.");
            }
        } catch (err) {
            setError(err.message);
            setFileLoading(false);
            setUploadedFile(null);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processFile(file);
    };

    const handleFileDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        await processFile(file);
    };

    const handleRemoveFile = (e) => {
        if (e) e.stopPropagation();
        setUploadedFile(null);
        setFilePreview(null);
        setFileData(null);
        setError('');
    };

    const fetchModules = async (autoSwitchTo = null) => {
        if (!currentUser) return;
        try {
            const q = query(
                collection(db, "modules"),
                where("userId", "==", currentUser.uid),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const mods = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setModules(mods);

            if (autoSwitchTo) {
                setActiveTab(autoSwitchTo);
            }
        } catch (err) {
            // Silently handle missing index during development by sorting in memory
            if (err.code === 'failed-precondition' || err.message.toLowerCase().includes("index")) {
                try {
                    const q = query(
                        collection(db, "modules"),
                        where("userId", "==", currentUser.uid)
                    );
                    const querySnapshot = await getDocs(q);
                    const mods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const sorted = mods.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setModules(sorted);
                    if (autoSwitchTo) setActiveTab(autoSwitchTo);
                } catch (fallbackErr) {
                    console.error("Fallback error", fallbackErr);
                    setError("Failed to load modules.");
                }
            } else {
                console.error("Error fetching modules", err);
                setError("An error occurred while loading your modules.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModules();
    }, [currentUser]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!content && !fileData) {
            setError("Please provide study material (paste text or upload an image/document).");
            return;
        }
        if (!topic) {
            setError("Please provide a topic name.");
            return;
        }

        setGenerating(true);
        setError('');

        try {
            const newModulesList = await generateModules(content, fileData, 'Flexible');

            if (!Array.isArray(newModulesList) || newModulesList.length === 0) {
                throw new Error("Invalid AI response. Try again.");
            }
            const now = new Date().toISOString();
            const currentTopic = topic;

            const promises = newModulesList.map(mod =>
                addDoc(collection(db, "modules"), {
                    userId: currentUser.uid,
                    topic: currentTopic,
                    title: mod.title,
                    content: mod.content,
                    completed: false,
                    progress: 0,
                    createdAt: now
                })
            );

            await Promise.all(promises);
            await fetchModules(currentTopic); // Auto-switch to the new topic

            setTopic('');
            setContent('');
            setUploadedFile(null);
            setFilePreview(null);
            setFileData(null);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to generate modules');
        } finally {
            setGenerating(false);
        }
    };


    const handleDeleteModule = async (id) => {
        if (!window.confirm("Are you sure you want to delete this module?")) return;
        try {
            await deleteDoc(doc(db, "modules", id));
            setModules(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            console.error("Delete error", err);
        }
    };

    const handleDeleteTopic = async () => {
        if (activeTab === 'All') return;
        if (!window.confirm(`Are you sure you want to delete the entire "${activeTab}" subject and all its modules?`)) return;

        setLoading(true);
        try {
            const batchPromises = filteredModules.map(mod => deleteDoc(doc(db, "modules", mod.id)));
            await Promise.all(batchPromises);
            setModules(prev => prev.filter(m => m.topic !== activeTab));
            setActiveTab('All');
        } catch (err) {
            console.error("Delete topic error", err);
            setError("Failed to delete topic. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const topics = useMemo(() => {
        const uniqueTopics = ['All', ...new Set(modules.map(m => m.topic || "Uploaded Study Material"))];
        return uniqueTopics;
    }, [modules]);

    const filteredModules = useMemo(() => {
        if (activeTab === 'All') return modules;
        return modules.filter(m => (m.topic || "Uploaded Study Material") === activeTab);
    }, [modules, activeTab]);

    return (
        <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Welcome back, {currentUser?.name?.split(' ')[0] || 'Student'}! 👋
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Your current study track: <strong style={{ color: 'var(--primary-light)' }}>{activeTab}</strong></p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '3rem' }}>

                {/* Upload Section */}
                <aside>
                    <section className="glass-panel" style={{ padding: '2rem', height: 'fit-content', position: 'sticky', top: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                            <PlusCircle size={24} />
                            <h2 style={{ fontSize: '1.25rem' }}>Add New Topic</h2>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="label">Topic Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. C++ Advanced"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Upload Study Material (Optional)</label>
                                <div style={{
                                    border: '2px dashed var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                    background: 'rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'border-color 0.2s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleFileDrop}
                                >
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf,.ppt,.pptx" 
                                        onChange={handleFileChange}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            opacity: 0,
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {fileLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-color)' }} />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Extracting text...</span>
                                        </>
                                    ) : uploadedFile ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                                            <CheckCircle size={24} style={{ color: 'var(--success-color)' }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-all' }}>{uploadedFile.name}</span>
                                            <button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', zIndex: 10 }}>
                                                Remove File
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud size={24} style={{ color: 'var(--text-secondary)' }} />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Drag & drop or <strong style={{ color: 'var(--primary-color)' }}>browse</strong>
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.6 }}>Images, PDF, PPTX (max 10MB)</span>
                                        </>
                                    )}
                                </div>
                                {filePreview && (
                                    <div style={{ marginTop: '0.75rem', position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                        <img src={filePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', objectFit: 'contain', border: '1px solid var(--border-color)' }} />
                                    </div>
                                )}
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label className="label" style={{ marginBottom: 0 }}>Paste Content</label>
                                    {uploadedFile && !filePreview && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--success-color)' }}>✓ Text extracted successfully</span>
                                    )}
                                </div>
                                <textarea
                                    className="input-field"
                                    style={{ minHeight: '150px', resize: 'vertical' }}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={fileData ? "Content will be analyzed from the uploaded image" : "Paste lecture notes or text..."}
                                    required={!fileData}
                                />
                            </div>

                            <button type="submit" className="btn-primary" disabled={generating || fileLoading}>
                                {generating ? <><Loader2 className="animate-spin" size={20} /> Generating...</> : <><FileText size={20} /> Generate Plan</>}
                            </button>
                        </form>

                    </section>
                </aside>

                {/* Modules Section */}
                <main>
                    {/* Tabs / Topic Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem', scrollbarWidth: 'none' }}>
                        {topics.map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '50px',
                                    border: '1px solid var(--border-color)',
                                    background: activeTab === t ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)',
                                    color: activeTab === t ? '#fff' : 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: activeTab === t ? 600 : 400,
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <GraduationCap size={16} />
                                {t}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem' }}>{activeTab === 'All' ? 'All Modules' : `${activeTab} Units`}</h2>
                            {activeTab !== 'All' && (
                                <button
                                    onClick={handleDeleteTopic}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', opacity: 0.7 }}
                                    onMouseEnter={(e) => e.target.style.opacity = 1}
                                    onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                >
                                    <Trash2 size={14} /> Delete entire subject
                                </button>
                            )}
                        </div>
                        <div className="badge badge-primary">{filteredModules.length} Lessons</div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading modules...</div>
                    ) : filteredModules.length === 0 ? (
                        <div className="glass-card" style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <FileText size={48} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No modules found</h3>
                            <p>Try adding new study material for this topic.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                            {filteredModules.map(mod => (
                                <div key={mod.id} className="glass-card animate-scale-in" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                    <button
                                        onClick={() => handleDeleteModule(mod.id)}
                                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.3 }}
                                        onMouseEnter={(e) => e.target.style.opacity = 1}
                                        onMouseLeave={(e) => e.target.style.opacity = 0.3}
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <div style={{ marginBottom: '1.5rem', flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                            {mod.topic}
                                        </div>
                                        <h4 style={{ fontSize: '1.15rem', marginBottom: '1rem', lineHeight: 1.4 }}>{mod.title}</h4>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                                            {mod.content}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                                        {mod.completed ? (
                                            <div className="badge badge-success" style={{ gap: '0.25rem' }}>
                                                <CheckCircle size={14} /> {mod.progress || 100}%
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                UNSOLVED
                                            </div>
                                        )}

                                        <button
                                            onClick={() => navigate(`/chat/${mod.id}`)}
                                            className="btn-primary"
                                            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                                        >
                                            <PlayCircle size={18} />
                                            {mod.completed ? 'Review' : 'Continue'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

            </div >
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-scale-in { animation: scaleIn 0.3s ease-out; }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div >
    );
}
