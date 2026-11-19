import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { Layers, CheckCircle, RotateCcw, Zap, Loader2, BookOpen } from "lucide-react";

export default function Review() {
    const { currentUser } = useAuth();
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchDueCards() {
            if (!currentUser) return;
            try {
                const now = new Date().toISOString();
                const q = query(
                    collection(db, "flashcards"),
                    where("userId", "==", currentUser.uid)
                );
                const snap = await getDocs(q);
                const allCards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const dueCards = allCards.filter(c => c.nextReviewDate <= now);
                setCards(dueCards);
                if (dueCards.length === 0) setDone(true);
            } catch (err) {
                console.error("Failed to fetch flashcards", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchDueCards();
    }, [currentUser]);

    const rateCard = async (rating) => {
        const card = cards[currentIndex];
        let intervalDays;
        if (rating === "again") intervalDays = 1;
        else if (rating === "good") intervalDays = 3;
        else intervalDays = 7;

        const nextReviewDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

        try {
            await updateDoc(doc(db, "flashcards", card.id), {
                interval: intervalDays,
                nextReviewDate
            });
        } catch (err) {
            console.error("Failed to update card", err);
        }

        setFlipped(false);
        setTimeout(() => {
            const next = currentIndex + 1;
            if (next >= cards.length) setDone(true);
            else setCurrentIndex(next);
        }, 250);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <div style={{ color: "var(--danger-color, #ef4444)", marginBottom: "1rem" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Failed to load flashcards</h2>
                <p style={{ color: "var(--text-secondary)" }}>{error}</p>
                {error.includes("Missing or insufficient permissions") && (
                    <p style={{ marginTop: "1rem", color: "var(--warning-color, #f59e0b)" }}>
                        <strong>Note:</strong> You need to deploy your Firestore Rules for Flashcards!
                    </p>
                )}
            </div>
        );
    }

    return (
        <div style={{ padding: "2rem 0", maxWidth: "700px", margin: "0 auto" }}>
            <style>{`
                .flip-inner {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    transform-style: preserve-3d;
                    transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .flip-inner.flipped { transform: rotateY(180deg); }
                .flip-face {
                    position: absolute;
                    inset: 0;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .flip-back { transform: rotateY(180deg); }
                .rating-btn {
                    flex: 1;
                    padding: 0.875rem;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                }
                .rating-btn:hover { transform: translateY(-2px); }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .rate-row { animation: slideUp 0.3s ease-out; }
            `}</style>

            <header style={{ marginBottom: "3rem", textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", color: "var(--primary-color, #6366f1)", marginBottom: "1rem" }}>
                    <Layers size={28} />
                    <h1 style={{ fontSize: "2.2rem", margin: 0 }}>Flashcard Review</h1>
                </div>
                <p style={{ color: "var(--text-secondary, #9ca3af)", fontSize: "1.05rem" }}>
                    {done ? "All done for today!" : `Card ${currentIndex + 1} of ${cards.length}`}
                </p>
            </header>

            {done ? (
                <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center" }}>
                    <CheckCircle size={56} style={{ color: "var(--success-color, #22c55e)", marginBottom: "1.5rem" }} />
                    <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>You are all caught up! 🎉</h2>
                    <p style={{ color: "var(--text-secondary, #9ca3af)", fontSize: "1rem" }}>
                        No flashcards are due for review right now. Complete more modules to generate new cards, or check back later.
                    </p>
                </div>
            ) : (
                <>
                    <div style={{ width: "100%", height: "4px", background: "var(--border-color, rgba(255,255,255,0.1))", borderRadius: "2px", marginBottom: "2.5rem", overflow: "hidden" }}>
                        <div style={{
                            height: "100%",
                            width: `${(currentIndex / cards.length) * 100}%`,
                            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                            borderRadius: "2px",
                            transition: "width 0.4s ease"
                        }} />
                    </div>

                    <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--primary-color, #6366f1)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            <BookOpen size={12} style={{ display: "inline", marginRight: "0.3rem", verticalAlign: "middle" }} />
                            {cards[currentIndex]?.topic || "General"}
                        </span>
                    </div>

                    <div onClick={() => setFlipped(f => !f)} style={{ perspective: "1000px", cursor: "pointer", marginBottom: "2rem", height: "280px" }}>
                        <div className={`flip-inner${flipped ? " flipped" : ""}`}>
                            <div className="flip-face glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem", textAlign: "center", gap: "1.5rem" }}>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Question</div>
                                <p style={{ fontSize: "1.25rem", lineHeight: 1.6, fontWeight: 500, margin: 0 }}>{cards[currentIndex]?.front}</p>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #9ca3af)", opacity: 0.5 }}>Tap to reveal answer →</div>
                            </div>

                            <div className="flip-face flip-back glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem", textAlign: "center", gap: "1.5rem", background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.25)" }}>
                                <div style={{ fontSize: "0.72rem", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Answer</div>
                                <p style={{ fontSize: "1.1rem", lineHeight: 1.7, margin: 0 }}>{cards[currentIndex]?.back}</p>
                            </div>
                        </div>
                    </div>

                    {flipped && (
                        <div className="rate-row" style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                            <button className="rating-btn" onClick={() => rateCard("again")}
                                style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "var(--danger-color, #ef4444)" }}>
                                <RotateCcw size={16} /> Again <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>1d</span>
                            </button>
                            <button className="rating-btn" onClick={() => rateCard("good")}
                                style={{ border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: "var(--primary-color, #6366f1)" }}>
                                👍 Good <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>3d</span>
                            </button>
                            <button className="rating-btn" onClick={() => rateCard("easy")}
                                style={{ border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "var(--success-color, #22c55e)" }}>
                                <Zap size={16} /> Easy <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>7d</span>
                            </button>
                        </div>
                    )}

                    {!flipped && (
                        <p style={{ textAlign: "center", color: "var(--text-secondary, #9ca3af)", fontSize: "0.875rem", marginTop: "1rem" }}>
                            Click the card to reveal the answer before rating.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
