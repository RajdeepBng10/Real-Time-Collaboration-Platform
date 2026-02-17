import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import api from '../services/api';
import { useBoard } from '../context/BoardContext';
import TaskCard from './TaskCard';

export default function TaskList({ list, boardId, onTaskClick }) {
    const { dispatch } = useBoard();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [adding, setAdding] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(list.title);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        setAdding(true);
        try {
            await api.post(`/lists/${list._id}/tasks`, { title: newTaskTitle });
            setNewTaskTitle('');
            setShowAdd(false);
        } catch (err) {
            console.error('Failed to create task:', err);
        } finally {
            setAdding(false);
        }
    };

    const handleUpdateTitle = async () => {
        if (editTitle.trim() && editTitle !== list.title) {
            try {
                await api.put(`/lists/${list._id}`, { title: editTitle });
            } catch (err) {
                setEditTitle(list.title);
            }
        } else {
            setEditTitle(list.title);
        }
        setEditing(false);
    };

    const handleDeleteList = async () => {
        if (!window.confirm(`Delete "${list.title}" and all its tasks?`)) return;
        try {
            await api.delete(`/lists/${list._id}`);
        } catch (err) {
            console.error('Failed to delete list:', err);
        }
    };

    const tasks = list.tasks || [];

    return (
        <div className="list-column">
            <div className="list-header">
                <div className="flex items-center gap-2">
                    {editing ? (
                        <input
                            className="input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleUpdateTitle}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                            autoFocus
                            style={{ padding: '4px 8px', fontSize: 14 }}
                        />
                    ) : (
                        <h3 onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
                            {list.title}
                        </h3>
                    )}
                    <span className="list-header .task-count" style={{
                        background: 'var(--bg-card)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                    }}>
                        {tasks.length}
                    </span>
                </div>
                <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={handleDeleteList}
                    title="Delete list"
                >
                    ✕
                </button>
            </div>

            <Droppable droppableId={list._id}>
                {(provided, snapshot) => (
                    <div
                        className={`list-tasks ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {tasks.map((task, index) => (
                            <TaskCard
                                key={task._id}
                                task={task}
                                index={index}
                                onClick={() => onTaskClick(task)}
                            />
                        ))}
                        {provided.placeholder}

                        {showAdd && (
                            <form onSubmit={handleAddTask} style={{ marginTop: 4 }}>
                                <input
                                    className="input"
                                    placeholder="Task title..."
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    autoFocus
                                    onBlur={() => !newTaskTitle && setShowAdd(false)}
                                />
                                {newTaskTitle && (
                                    <div className="flex gap-2" style={{ marginTop: 6 }}>
                                        <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                                            {adding ? '...' : 'Add'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => { setShowAdd(false); setNewTaskTitle(''); }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                )}
            </Droppable>

            {!showAdd && (
                <button className="add-task-btn" onClick={() => setShowAdd(true)}>
                    + Add task
                </button>
            )}
        </div>
    );
}
