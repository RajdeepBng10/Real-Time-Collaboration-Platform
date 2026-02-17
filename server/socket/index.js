const jwt = require('jsonwebtoken');

function setupSocket(io) {
    // Authenticate socket connections via JWT
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // Join a board room
        socket.on('board:join', (boardId) => {
            socket.join(`board:${boardId}`);
            console.log(`User ${socket.userId} joined board:${boardId}`);
        });

        // Leave a board room
        socket.on('board:leave', (boardId) => {
            socket.leave(`board:${boardId}`);
            console.log(`User ${socket.userId} left board:${boardId}`);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userId}`);
        });
    });
}

module.exports = setupSocket;
