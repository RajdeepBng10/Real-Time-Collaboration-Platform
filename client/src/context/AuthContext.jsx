import { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

const initialState = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: true,
    error: null,
};

function authReducer(state, action) {
    switch (action.type) {
        case 'AUTH_LOADING':
            return { ...state, loading: true, error: null };
        case 'AUTH_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                loading: false,
                error: null,
            };
        case 'AUTH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'LOGOUT':
            return { user: null, token: null, loading: false, error: null };
        case 'SET_LOADING_FALSE':
            return { ...state, loading: false };
        default:
            return state;
    }
}

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                dispatch({ type: 'SET_LOADING_FALSE' });
                return;
            }
            try {
                const res = await api.get('/auth/me');
                dispatch({
                    type: 'AUTH_SUCCESS',
                    payload: { user: res.data.user, token },
                });
                connectSocket(token);
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                dispatch({ type: 'SET_LOADING_FALSE' });
            }
        };
        verifyToken();
    }, []);

    const login = async (email, password) => {
        dispatch({ type: 'AUTH_LOADING' });
        try {
            const res = await api.post('/auth/login', { email, password });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
            connectSocket(token);
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            dispatch({ type: 'AUTH_ERROR', payload: message });
            return { success: false, message };
        }
    };

    const signup = async (name, email, password) => {
        dispatch({ type: 'AUTH_LOADING' });
        try {
            const res = await api.post('/auth/signup', { name, email, password });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
            connectSocket(token);
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Signup failed';
            dispatch({ type: 'AUTH_ERROR', payload: message });
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        disconnectSocket();
        dispatch({ type: 'LOGOUT' });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
