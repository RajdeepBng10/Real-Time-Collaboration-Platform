import { getAvatarColor, getInitials } from './Navbar';

export default function BoardCard({ board, onClick, onDelete, style }) {
    const memberCount = board.members?.length || 0;
    const created = new Date(board.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    return (
        <div
            className="card board-card animate-fadeIn"
            onClick={onClick}
            style={style}
        >
            <h3>{board.title}</h3>
            <p>{board.description || 'No description'}</p>
            <div className="board-card-footer">
                <div className="flex items-center gap-2">
                    <div className="avatar-stack">
                        {board.members?.slice(0, 3).map((m) => (
                            <div
                                key={m._id}
                                className="avatar avatar-sm"
                                style={{ background: getAvatarColor(m.name) }}
                                title={m.name}
                            >
                                {getInitials(m.name)}
                            </div>
                        ))}
                    </div>
                    {memberCount > 3 && (
                        <span className="text-muted" style={{ fontSize: 12 }}>
                            +{memberCount - 3}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="board-card-meta">{created}</span>
                    <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(board._id);
                        }}
                        title="Delete board"
                    >
                        🗑
                    </button>
                </div>
            </div>
        </div>
    );
}
