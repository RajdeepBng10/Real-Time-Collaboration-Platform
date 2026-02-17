import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function SearchBar({ boardId, onSelectTask }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }
            try {
                const res = await api.get(`/boards/${boardId}/search?q=${encodeURIComponent(query)}`);
                setResults(res.data.tasks || []);
                setShowResults(true);
            } catch (err) {
                console.error('Search error:', err);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, boardId]);

    const handleSelect = (task) => {
        onSelectTask(task);
        setQuery('');
        setShowResults(false);
    };

    return (
        <div className="search-bar" ref={ref}>
            <span className="search-icon">🔍</span>
            <input
                className="input"
                placeholder="Search tasks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
            />
            {showResults && results.length > 0 && (
                <div className="search-results">
                    {results.map((task) => (
                        <div
                            key={task._id}
                            className="search-result-item"
                            onClick={() => handleSelect(task)}
                        >
                            <div style={{ fontWeight: 500 }}>{task.title}</div>
                            {task.description && (
                                <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                                    {task.description.slice(0, 60)}...
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {showResults && query.length >= 2 && results.length === 0 && (
                <div className="search-results">
                    <div className="search-result-item text-muted">No tasks found</div>
                </div>
            )}
        </div>
    );
}
