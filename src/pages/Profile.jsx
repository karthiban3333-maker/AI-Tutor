import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Mail, GraduationCap, Flame, Loader2, Save } from 'lucide-react';

export default function Profile() {
    const { currentUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [name, setName] = useState('');
    const [college, setCollege] = useState('');
    const [socraticMode, setSocraticMode] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            if (!currentUser) return;
            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setName(data.name || '');
                    setCollege(data.college || '');
                    setSocraticMode(data.socraticMode || false);
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [currentUser]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const docRef = doc(db, "users", currentUser.uid);
            await updateDoc(docRef, {
                name,
                college,
                socraticMode
            });
            setSuccess("Profile updated successfully!");
        } catch (err) {
            setError(err.message || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><Loader2 className="animate-spin" size={32} /></div>;
    }

    return (
        <div className="animate-fade-in" style={{ padding: '2rem 0', maxWidth: '800px' }}>

            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Profile</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Manage your personal information and learning journey.</p>
            </header>

            <div className="glass-panel" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 600 }}>{name ? name.charAt(0).toUpperCase() : 'S'}</span>
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{name || 'Student'}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} /> {currentUser?.email}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)' }}><Flame size={16} /> {currentUser?.streak || 0} Day Streak</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={16} /> Full Name
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <GraduationCap size={16} /> College / University
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                value={college}
                                onChange={(e) => setCollege(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={16} /> Email Address (Read Only)
                        </label>
                        <input
                            type="email"
                            className="input-field"
                            value={currentUser?.email || ''}
                            disabled
                            style={{ opacity: 0.7, cursor: 'not-allowed' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="socraticMode"
                            checked={socraticMode}
                            onChange={(e) => setSocraticMode(e.target.checked)}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: 'var(--primary-color)'
                            }}
                        />
                        <label htmlFor="socraticMode" style={{ cursor: 'pointer', fontSize: '0.95rem', userSelect: 'none' }}>
                            <strong style={{ color: 'var(--primary-color)' }}>Socratic Learning Mode:</strong> Teach using hints and guiding questions instead of giving answers directly.
                        </label>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? <><Loader2 className="animate-spin" size={20} /> Saving...</> : <><Save size={20} /> Save Changes</>}
                        </button>
                    </div>

                </form>
            </div>

        </div>
    );
}
