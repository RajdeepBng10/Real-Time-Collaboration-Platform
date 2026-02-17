import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import BoardCard from '../components/BoardCard';

export default function Dashboard() {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBoards();
    }, []);

    const fetchBoards = async () => {
        try {
            const res = await api.get('/boards');
            setBoards(res.data.boards);
        } catch (err) {
            console.error('Failed to fetch boards:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const res = await api.post('/boards', { title: newTitle, description: newDesc });
            setBoards([res.data.board, ...boards]);
            setNewTitle('');
            setNewDesc('');
            setShowCreate(false);
        } catch (err) {
            console.error('Failed to create board:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (boardId) => {
        if (!window.confirm('Are you sure you want to delete this board?')) return;
        try {
            await api.delete(`/boards/${boardId}`);
            setBoards(boards.filter((b) => b._id !== boardId));
        } catch (err) {
            console.error('Failed to delete board:', err);
        }
    };

    if (loading) {
        return (
            <div className="loading-container" style={{ height: 'calc(100vh - 60px)' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Your Boards</h1>
            </div>

            <div className="boards-grid">
                <div className="create-board-card" onClick={() => setShowCreate(true)}>
                    <div className="plus-icon">+</div>
                    <span>Create new board</span>
                </div>

                {boards.map((board, i) => (
                    <BoardCard
                        key={board._id}
                        board={board}
                        onClick={() => navigate(`/board/${board._id}`)}
                        onDelete={handleDelete}
                        style={{ animationDelay: `${i * 0.05}s` }}
                    />
                ))}
            </div>

            {boards.length === 0 && (
                <div className="empty-state" style={{ marginTop: 60 }}>
                    <div className="empty-icon">📋</div>
                    <h3>No boards yet</h3>
                    <p>Create your first board to start collaborating</p>
                </div>
            )}

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create Board</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label>Board Title</label>
                                    <input
                                        className="input"
                                        placeholder="e.g. Project Alpha"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Description (optional)</label>
                                    <input
                                        className="input"
                                        placeholder="Brief description of this board"
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Board'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
