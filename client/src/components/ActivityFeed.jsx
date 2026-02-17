import { useState, useEffect } from 'react';
import api from '../services/api';

const actionLabels = {
    board_created: 'created the board',
    board_updated: 'updated the board',
    list_created: 'created list',
    list_updated: 'updated list',
    list_deleted: 'deleted list',
    task_created: 'created task',
    task_updated: 'updated task',
    task_deleted: 'deleted task',
    task_moved: 'moved task',
    member_added: 'added member',
    member_removed: 'removed a member',
    task_assigned: 'assigned a user to task',
    task_unassigned: 'unassigned a user from task',
};

function timeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ boardId, onClose }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    useEffect(() => {
        fetchActivities();
    }, [page]);

    const fetchActivities = async () => {
        try {
            const res = await api.get(`/boards/${boardId}/activity?page=${page}&limit=20`);
            setActivities(res.data.activities);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Failed to fetch activities:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="activity-sidebar">
            <div className="activity-header">
                <h2>Activity</h2>
                <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
            </div>
            <div className="activity-list">
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <p>No activity yet</p>
                    </div>
                ) : (
                    activities.map((a) => (
                        <div key={a._id} className="activity-item">
                            <div className="activity-dot" />
                            <div className="activity-content">
                                <p>
                                    <strong>{a.user?.name || 'Unknown'}</strong>{' '}
                                    {actionLabels[a.action] || a.action}
                                    {a.details?.title && (
                                        <> "<strong>{a.details.title}</strong>"</>
                                    )}
                                    {a.details?.from && a.details?.to && (
                                        <> from {a.details.from} → {a.details.to}</>
                                    )}
                                    {a.details?.memberName && (
                                        <> <strong>{a.details.memberName}</strong></>
                                    )}
                                </p>
                                <div className="activity-time">{timeAgo(a.createdAt)}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {pagination && pagination.pages > 1 && (
                <div className="pagination" style={{ borderTop: '1px solid var(--border-color)', padding: 12 }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        ← Prev
                    </button>
                    <span className="page-info">{page} / {pagination.pages}</span>
                    <button
                        className="btn btn-ghost btn-sm"
                        disabled={page >= pagination.pages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
