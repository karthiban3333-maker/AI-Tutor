import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Home, MessageSquare, LayoutDashboard, User, LogOut, Layers } from 'lucide-react';

export default function Navbar() {
    const { logout, currentUser } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <aside className="sidebar">
            <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                    <BookOpen />
                    AI Tutor
                </h2>
            </div>

            <nav style={{ padding: '1.5rem 1rem', flex: 1 }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div className="label" style={{ paddingLeft: '1rem' }}>Navigation</div>
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Home size={20} />
                        <span>Home</span>
                    </NavLink>
                    <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <User size={20} />
                        <span>Profile</span>
                    </NavLink>
                    <NavLink to="/review" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Layers size={20} />
                        <span>Review Cards</span>
                    </NavLink>
                </div >
            </nav >

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{currentUser?.name || "Student"}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Streak: {currentUser?.streak || 0} 🔥</div>
                </div>
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger-color)' }} onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside >
    );
}
