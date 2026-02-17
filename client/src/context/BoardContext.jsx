import { createContext, useContext, useReducer, useCallback } from 'react';
import api from '../services/api';

const BoardContext = createContext(null);

const initialState = {
    board: null,
    lists: [],
    loading: false,
    error: null,
};

function boardReducer(state, action) {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: true, error: null };
        case 'SET_BOARD': {
            return {
                ...state,
                board: action.payload.board,
                lists: action.payload.lists,
                loading: false,
            };
        }
        case 'CLEAR_BOARD':
            return { ...initialState };
        case 'ADD_LIST':
            return { ...state, lists: [...state.lists, action.payload] };
        case 'UPDATE_LIST':
            return {
                ...state,
                lists: state.lists.map((l) =>
                    l._id === action.payload._id ? { ...l, ...action.payload, tasks: l.tasks } : l
                ),
            };
        case 'DELETE_LIST':
            return {
                ...state,
                lists: state.lists.filter((l) => l._id !== action.payload),
            };
        case 'ADD_TASK': {
            const task = action.payload;
            return {
                ...state,
                lists: state.lists.map((l) =>
                    l._id === task.list ? { ...l, tasks: [...(l.tasks || []), task] } : l
                ),
            };
        }
        case 'UPDATE_TASK': {
            const updated = action.payload;
            return {
                ...state,
                lists: state.lists.map((l) => ({
                    ...l,
                    tasks: (l.tasks || []).map((t) =>
                        t._id === updated._id ? updated : t
                    ),
                })),
            };
        }
        case 'DELETE_TASK': {
            const { taskId, listId } = action.payload;
            return {
                ...state,
                lists: state.lists.map((l) =>
                    l._id === listId
                        ? { ...l, tasks: (l.tasks || []).filter((t) => t._id !== taskId) }
                        : l
                ),
            };
        }
        case 'MOVE_TASK': {
            const { task, sourceListId, destListId, position } = action.payload;
            let newLists = state.lists.map((l) => {
                if (l._id === sourceListId) {
                    return { ...l, tasks: (l.tasks || []).filter((t) => t._id !== task._id) };
                }
                return l;
            });
            newLists = newLists.map((l) => {
                if (l._id === destListId) {
                    const tasks = [...(l.tasks || [])];
                    const insertAt = Math.min(position, tasks.length);
                    tasks.splice(insertAt, 0, task);
                    return { ...l, tasks };
                }
                return l;
            });
            return { ...state, lists: newLists };
        }
        case 'UPDATE_BOARD_INFO':
            return { ...state, board: { ...state.board, ...action.payload } };
        case 'SET_ERROR':
            return { ...state, loading: false, error: action.payload };
        default:
            return state;
    }
}

export function BoardProvider({ children }) {
    const [state, dispatch] = useReducer(boardReducer, initialState);

    const fetchBoard = useCallback(async (boardId) => {
        dispatch({ type: 'SET_LOADING' });
        try {
            const res = await api.get(`/boards/${boardId}`);
            dispatch({ type: 'SET_BOARD', payload: res.data });
        } catch (error) {
            dispatch({
                type: 'SET_ERROR',
                payload: error.response?.data?.message || 'Failed to load board',
            });
        }
    }, []);

    return (
        <BoardContext.Provider value={{ ...state, dispatch, fetchBoard }}>
            {children}
        </BoardContext.Provider>
    );
}

export const useBoard = () => {
    const context = useContext(BoardContext);
    if (!context) throw new Error('useBoard must be used within BoardProvider');
    return context;
};
