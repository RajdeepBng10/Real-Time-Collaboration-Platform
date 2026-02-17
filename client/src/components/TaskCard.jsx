import { Draggable } from '@hello-pangea/dnd';
import { getAvatarColor, getInitials } from './Navbar';

export default function TaskCard({ task, index, onClick }) {
    const priorityLabels = {
        low: 'badge-low',
        medium: 'badge-medium',
        high: 'badge-high',
        urgent: 'badge-urgent',
    };

    return (
        <Draggable draggableId={task._id} index={index}>
            {(provided, snapshot) => (
                <div
                    className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={onClick}
                >
                    <div className="task-card-title">{task.title}</div>
                    <div className="task-card-meta">
                        <div className="task-card-tags">
                            <span className={`badge ${priorityLabels[task.priority] || 'badge-medium'}`}>
                                {task.priority}
                            </span>
                            {task.dueDate && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    📅 {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                        {task.assignees?.length > 0 && (
                            <div className="avatar-stack">
                                {task.assignees.slice(0, 3).map((a) => (
                                    <div
                                        key={a._id}
                                        className="avatar avatar-sm"
                                        style={{ background: getAvatarColor(a.name) }}
                                        title={a.name}
                                    >
                                        {getInitials(a.name)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}
