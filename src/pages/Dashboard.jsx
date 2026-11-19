import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { BookOpen, Target, Zap, AlertTriangle, Loader2, TrendingDown } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, completed: 0, avgScore: 0 });
    const [weakAreas, setWeakAreas] = useState([]);

    // Chart Data State
    const [pieData, setPieData] = useState(null);
    const [barData, setBarData] = useState(null);

    useEffect(() => {
        async function fetchPerformanceData() {
            if (!currentUser) return;
            try {
                const q = query(
                    collection(db, "modules"),
                    where("userId", "==", currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const mods = querySnapshot.docs.map(doc => doc.data());

                const total = mods.length;
                const completedMods = mods.filter(m => m.completed);
                const completedCount = completedMods.length;

                // Average Score
                const totalScore = completedMods.reduce((acc, curr) => acc + (curr.progress || 0), 0);
                const avgScore = completedCount > 0 ? Math.round(totalScore / completedCount) : 0;

                setStats({ total, completed: completedCount, avgScore });

                // Build Pie Chart Data (Score Distribution)
                const scoreGroups = { "High (80-100)": 0, "Medium (50-79)": 0, "Low (<50)": 0 };
                completedMods.forEach(m => {
                    if (m.progress >= 80) scoreGroups["High (80-100)"]++;
                    else if (m.progress >= 50) scoreGroups["Medium (50-79)"]++;
                    else scoreGroups["Low (<50)"]++;
                });

                setPieData({
                    labels: Object.keys(scoreGroups),
                    datasets: [{
                        data: Object.values(scoreGroups),
                        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(234, 179, 8, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                        borderColor: ['rgb(34, 197, 94)', 'rgb(234, 179, 8)', 'rgb(239, 68, 68)'],
                        borderWidth: 1,
                        hoverOffset: 4
                    }]
                });

                // Build Bar Chart Data (Weekly Activity based on created/completed dates)
                // Simplified: Group by Day of Week 
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const activityCounts = [0, 0, 0, 0, 0, 0, 0];

                mods.forEach(m => {
                    if (m.createdAt) {
                        const date = new Date(m.createdAt);
                        activityCounts[date.getDay()]++;
                    }
                });

                setBarData({
                    labels: days,
                    datasets: [{
                        label: 'Modules Created/Studied',
                        data: activityCounts,
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        borderColor: 'rgb(99, 102, 241)',
                        borderWidth: 1,
                        borderRadius: 6,
                    }]
                });

                // Build Weak-Area list: completed modules sorted by score ascending
                const scored = completedMods
                    .filter(m => m.topic)
                    .map(m => ({ topic: m.topic, score: m.progress || 0 }))
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 5);
                setWeakAreas(scored);

            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchPerformanceData();
    }, [currentUser]);

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><Loader2 className="animate-spin" size={32} /></div>;
    }

    return (
        <div className="animate-fade-in" style={{ padding: '2rem 0' }}>

            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Dashboard</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Track your learning progress and stay motivated.</p>
            </header>

            {/* Top Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{stats.total}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Total Modules</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Target size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{stats.completed}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Completed Modules</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{currentUser?.streak || 0} 🔥</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Current Day Streak</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Target size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{stats.avgScore}%</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Avg. Understanding Score</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '2rem' }}>

                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Performance Breakdown
                    </h3>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', height: '300px' }}>
                        {stats.completed === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Complete modules to see breakdown.</p>
                        ) : (
                            <Pie
                                data={pieData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'bottom', labels: { color: '#f8fafc', padding: 20 } }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Weekly Activity
                    </h3>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', height: '300px' }}>
                        {stats.total === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Create modules to see activity.</p>
                        ) : (
                            <Bar
                                data={barData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            grid: { color: 'rgba(255,255,255,0.05)' },
                                            ticks: { color: '#94a3b8', stepSize: 1 }
                                        },
                                        x: {
                                            grid: { display: false },
                                            ticks: { color: '#94a3b8' }
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

            </div>

            {/* Weak-Area Summary Card */}
            <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <TrendingDown size={20} style={{ color: '#ef4444' }} />
                    Weak Areas to Revisit
                </h3>

                {weakAreas.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Complete modules to see which topics need more attention.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {weakAreas.map((area, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* Rank badge */}
                                <div style={{
                                    minWidth: '28px', height: '28px', borderRadius: '50%',
                                    background: i === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                                    color: i === 0 ? '#ef4444' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.75rem', fontWeight: 700
                                }}>
                                    {i + 1}
                                </div>

                                {/* Topic name */}
                                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {area.topic}
                                </span>

                                {/* Score bar */}
                                <div style={{ width: '140px', height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${area.score}%`,
                                        borderRadius: '3px',
                                        background: area.score >= 70
                                            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                            : area.score >= 40
                                            ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                                            : 'linear-gradient(90deg, #ef4444, #dc2626)',
                                        transition: 'width 0.6s ease'
                                    }} />
                                </div>

                                {/* Score label */}
                                <span style={{
                                    minWidth: '40px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700,
                                    color: area.score >= 70 ? '#22c55e' : area.score >= 40 ? '#eab308' : '#ef4444'
                                }}>
                                    {area.score}%
                                </span>

                                {/* Alert icon for really low scores */}
                                {area.score < 40 && (
                                    <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
