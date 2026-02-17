import { useState } from 'react';
import api from '../services/api';
import { useBoard } from '../context/BoardContext';
import { getAvatarColor, getInitials } from './Navbar';

export default function TaskModal({ task, board, onClose, onUpdate }) {
    const { dispatch } = useBoard();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [priority, setPriority] = useState(task.priority || 'medium');
    const [dueDate, setDueDate] = useState(
        task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
    );
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put(`/tasks/${task._id}`, {
                title,
                description,
                priority,
                dueDate: dueDate || null,
            });
            onUpdate(res.data.task);
        } catch (err) {
            console.error('Failed to update task:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this task?')) return;
        try {
            await api.delete(`/tasks/${task._id}`);
            onClose();
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    const handleAssign = async (userId) => {
        try {
            const res = await api.put(`/tasks/${task._id}/assign`, { userId });
            onUpdate(res.data.task);
        } catch (err) {
            console.error('Failed to assign:', err);
        }
    };

    const handleUnassign = async (userId) => {
        try {
            const res = await api.put(`/tasks/${task._id}/unassign`, { userId });
            onUpdate(res.data.task);
        } catch (err) {
            console.error('Failed to unassign:', err);
        }
    };

    const assigneeIds = new Set((task.assignees || []).map(a => a._id));
    const availableMembers = (board?.members || []).filter(m => !assigneeIds.has(m._id));

    return (
        <div className="modal-overlay task-modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Task Details</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="input-group">
                        <label>Title</label>
                        <input
                            className="input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="task-section">
                        <h3>Description</h3>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Priority</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Due Date</label>
                            <input
                                type="date"
                                className="input"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="task-section">
                        <h3>Assignees</h3>
                        <div className="member-list">
                            {(task.assignees || []).map((a) => (
                                <div key={a._id} className="member-item">
                                    <div className="member-info">
                                        <div
                                            className="avatar avatar-sm"
                                            style={{ background: getAvatarColor(a.name) }}
                                        >
                                            {getInitials(a.name)}
                                        </div>
                                        <div>
                                            <div className="member-info .name" style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleUnassign(a._id)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            {availableMembers.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <select
                                        className="input"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleAssign(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>+ Assign a member...</option>
                                        {availableMembers.map((m) => (
                                            <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                        Delete Task
                    </button>
                    <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
