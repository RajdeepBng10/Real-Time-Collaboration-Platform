const express = require('express');
const auth = require('../middleware/auth');
const List = require('../models/List');
const Task = require('../models/Task');
const Board = require('../models/Board');
const Activity = require('../models/Activity');

const router = express.Router();

// POST /api/boards/:boardId/lists - Create list
router.post('/boards/:boardId/lists', auth, async (req, res) => {
    try {
        const board = await Board.findById(req.params.boardId);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        const isMember = board.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Access denied' });

        const { title } = req.body;
        if (!title) return res.status(400).json({ message: 'List title is required' });

        const maxPosition = await List.findOne({ board: board._id }).sort({ position: -1 });
        const position = maxPosition ? maxPosition.position + 1 : 0;

        const list = await List.create({
            title,
            position,
            board: board._id,
        });

        await Activity.create({
            action: 'list_created',
            board: board._id,
            user: req.user._id,
            details: { title: list.title },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${board._id}`).emit('list:created', { list: { ...list.toObject(), tasks: [] } });

        res.status(201).json({ list: { ...list.toObject(), tasks: [] } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/lists/:id - Update list
router.put('/lists/:id', auth, async (req, res) => {
    try {
        const list = await List.findById(req.params.id);
        if (!list) return res.status(404).json({ message: 'List not found' });

        const { title } = req.body;
        if (title) list.title = title;
        await list.save();

        await Activity.create({
            action: 'list_updated',
            board: list.board,
            user: req.user._id,
            details: { title: list.title },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${list.board}`).emit('list:updated', { list });

        res.json({ list });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/lists/:id - Delete list
router.delete('/lists/:id', auth, async (req, res) => {
    try {
        const list = await List.findById(req.params.id);
        if (!list) return res.status(404).json({ message: 'List not found' });

        await Task.deleteMany({ list: list._id });
        const boardId = list.board;
        await list.deleteOne();

        await Activity.create({
            action: 'list_deleted',
            board: boardId,
            user: req.user._id,
            details: { title: list.title },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${boardId}`).emit('list:deleted', { listId: list._id });

        res.json({ message: 'List deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
