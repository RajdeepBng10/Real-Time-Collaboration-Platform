import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getAvatarColor, getInitials } from './Navbar';

export default function MemberManager({ board, onClose }) {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setAdding(true);
        setError('');
        try {
            await api.post(`/boards/${board._id}/members`, { email });
            setEmail('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add member');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (userId) => {
        if (!window.confirm('Remove this member from the board?')) return;
        try {
            await api.delete(`/boards/${board._id}/members/${userId}`);
        } catch (err) {
            console.error('Failed to remove member:', err);
        }
    };

    const isOwner = board.createdBy?._id === user?._id;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Board Members</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input
                            className="input"
                            placeholder="Add by email..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                            {adding ? '...' : 'Add'}
                        </button>
                    </form>
                    {error && <div className="alert alert-error">{error}</div>}
                    <div className="member-list">
                        {board.members?.map((m) => (
                            <div key={m._id} className="member-item">
                                <div className="member-info">
                                    <div
                                        className="avatar avatar-sm"
                                        style={{ background: getAvatarColor(m.name) }}
                                    >
                                        {getInitials(m.name)}
                                    </div>
                                    <div>
                                        <div className="name">{m.name}</div>
                                        <div className="email">{m.email}</div>
                                    </div>
                                </div>
                                {isOwner && m._id !== user._id && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleRemove(m._id)}
                                        style={{ color: 'var(--danger)' }}
                                    >
                                        Remove
                                    </button>
                                )}
                                {m._id === board.createdBy?._id && (
                                    <span className="badge badge-low" style={{ fontSize: 10 }}>Owner</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
