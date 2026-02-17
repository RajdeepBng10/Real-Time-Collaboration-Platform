import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const avatarColors = [
    '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#ec4899', '#8b5cf6', '#14b8a6',
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <nav className="navbar">
            <Link to="/dashboard" className="navbar-brand">
                <div className="logo">C</div>
                <span>CollabBoard</span>
            </Link>
            {user && (
                <div className="navbar-actions">
                    <div
                        className="avatar"
                        style={{ background: getAvatarColor(user.name) }}
                        title={user.name}
                    >
                        {getInitials(user.name)}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={logout}>
                        Logout
                    </button>
                </div>
            )}
        </nav>
    );
}

export { getAvatarColor, getInitials };
