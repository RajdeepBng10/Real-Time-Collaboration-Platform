import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { useBoard } from '../context/BoardContext';
import { getSocket, joinBoard, leaveBoard } from '../services/socket';
import api from '../services/api';
import TaskList from '../components/TaskList';
import TaskModal from '../components/TaskModal';
import SearchBar from '../components/SearchBar';
import ActivityFeed from '../components/ActivityFeed';
import MemberManager from '../components/MemberManager';

export default function BoardView() {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const { board, lists, loading, error, dispatch, fetchBoard } = useBoard();
    const [selectedTask, setSelectedTask] = useState(null);
    const [showActivity, setShowActivity] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [addingList, setAddingList] = useState(false);

    useEffect(() => {
        fetchBoard(boardId);
        joinBoard(boardId);

        return () => {
            leaveBoard(boardId);
            dispatch({ type: 'CLEAR_BOARD' });
        };
    }, [boardId, fetchBoard, dispatch]);

    // Socket event listeners
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handlers = {
            'list:created': (data) => dispatch({ type: 'ADD_LIST', payload: data.list }),
            'list:updated': (data) => dispatch({ type: 'UPDATE_LIST', payload: data.list }),
            'list:deleted': (data) => dispatch({ type: 'DELETE_LIST', payload: data.listId }),
            'task:created': (data) => dispatch({ type: 'ADD_TASK', payload: data.task }),
            'task:updated': (data) => {
                dispatch({ type: 'UPDATE_TASK', payload: data.task });
                if (selectedTask && selectedTask._id === data.task._id) {
                    setSelectedTask(data.task);
                }
            },
            'task:deleted': (data) => {
                dispatch({ type: 'DELETE_TASK', payload: { taskId: data.taskId, listId: data.listId } });
                if (selectedTask && selectedTask._id === data.taskId) {
                    setSelectedTask(null);
                }
            },
            'task:moved': (data) => dispatch({ type: 'MOVE_TASK', payload: data }),
            'board:updated': (data) => dispatch({ type: 'UPDATE_BOARD_INFO', payload: data.board }),
            'board:deleted': () => navigate('/dashboard'),
            'member:added': (data) => dispatch({ type: 'UPDATE_BOARD_INFO', payload: data.board }),
            'member:removed': (data) => dispatch({ type: 'UPDATE_BOARD_INFO', payload: data.board }),
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        return () => {
            Object.keys(handlers).forEach((event) => {
                socket.off(event);
            });
        };
    }, [dispatch, selectedTask, navigate]);

    const handleDragEnd = useCallback(async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceList = lists.find(l => l._id === source.droppableId);
        const task = sourceList?.tasks?.find(t => t._id === draggableId);
        if (!task) return;

        // Optimistic update
        dispatch({
            type: 'MOVE_TASK',
            payload: {
                task: { ...task, list: destination.droppableId },
                sourceListId: source.droppableId,
                destListId: destination.droppableId,
                position: destination.index,
            },
        });

        try {
            await api.put(`/tasks/${draggableId}/move`, {
                listId: destination.droppableId,
                position: destination.index,
            });
        } catch (err) {
            console.error('Move failed:', err);
            fetchBoard(boardId);
        }
    }, [lists, dispatch, boardId, fetchBoard]);

    const handleAddList = async (e) => {
        e.preventDefault();
        if (!newListTitle.trim()) return;
        setAddingList(true);
        try {
            await api.post(`/boards/${boardId}/lists`, { title: newListTitle });
            setNewListTitle('');
        } catch (err) {
            console.error('Failed to create list:', err);
        } finally {
            setAddingList(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container" style={{ height: 'calc(100vh - 60px)' }}>
                <div className="spinner" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="loading-container" style={{ height: 'calc(100vh - 60px)', flexDirection: 'column', gap: 16 }}>
                <div className="alert alert-error">{error}</div>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="board-view">
            <div className="board-header">
                <div className="board-header-left">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
                        ← Back
                    </button>
                    <h1>{board?.title}</h1>
                    {board?.description && (
                        <span className="text-secondary" style={{ fontSize: 13 }}>{board.description}</span>
                    )}
                </div>
                <div className="board-header-right">
                    <SearchBar boardId={boardId} onSelectTask={(task) => setSelectedTask(task)} />
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowMembers(true)}
                    >
                        👥 Members ({board?.members?.length || 0})
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowActivity(!showActivity)}
                    >
                        📋 Activity
                    </button>
                </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="board-columns">
                    {lists.map((list) => (
                        <TaskList
                            key={list._id}
                            list={list}
                            boardId={boardId}
                            onTaskClick={(task) => setSelectedTask(task)}
                        />
                    ))}

                    <div className="add-list-card">
                        <form onSubmit={handleAddList}>
                            <input
                                className="input"
                                placeholder="Add a new list..."
                                value={newListTitle}
                                onChange={(e) => setNewListTitle(e.target.value)}
                            />
                            {newListTitle && (
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm w-full"
                                    disabled={addingList}
                                >
                                    {addingList ? 'Adding...' : '+ Add List'}
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </DragDropContext>

            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    board={board}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updated) => setSelectedTask(updated)}
                />
            )}

            {showActivity && (
                <ActivityFeed boardId={boardId} onClose={() => setShowActivity(false)} />
            )}

            {showMembers && (
                <MemberManager
                    board={board}
                    onClose={() => setShowMembers(false)}
                />
            )}
        </div>
    );
}
