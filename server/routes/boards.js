const express = require('express');
const auth = require('../middleware/auth');
const Board = require('../models/Board');
const List = require('../models/List');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const User = require('../models/User');

const router = express.Router();

// GET /api/boards - List user's boards (paginated)
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const query = {
            $or: [
                { createdBy: req.user._id },
                { members: req.user._id },
            ],
        };

        const [boards, total] = await Promise.all([
            Board.find(query)
                .populate('createdBy', 'name email')
                .populate('members', 'name email')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Board.countDocuments(query),
        ]);

        res.json({
            boards,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/boards - Create board
router.post('/', auth, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Board title is required' });
        }

        const board = await Board.create({
            title,
            description: description || '',
            createdBy: req.user._id,
            members: [req.user._id],
        });

        await board.populate('createdBy', 'name email');
        await board.populate('members', 'name email');

        await Activity.create({
            action: 'board_created',
            board: board._id,
            user: req.user._id,
            details: { title: board.title },
        });

        res.status(201).json({ board });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/boards/:id - Get board with lists & tasks
router.get('/:id', auth, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members', 'name email');

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        const isMember = board.members.some(m => m._id.toString() === req.user._id.toString());
        if (!isMember) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const lists = await List.find({ board: board._id }).sort({ position: 1 });
        const tasks = await Task.find({ board: board._id })
            .populate('assignees', 'name email')
            .sort({ position: 1 });

        // Group tasks by list
        const tasksByList = {};
        lists.forEach(l => { tasksByList[l._id.toString()] = []; });
        tasks.forEach(t => {
            const listId = t.list.toString();
            if (tasksByList[listId]) {
                tasksByList[listId].push(t);
            }
        });

        res.json({
            board,
            lists: lists.map(l => ({
                ...l.toObject(),
                tasks: tasksByList[l._id.toString()] || [],
            })),
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/boards/:id - Update board
router.put('/:id', auth, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        if (board.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the board owner can update' });
        }

        const { title, description } = req.body;
        if (title) board.title = title;
        if (description !== undefined) board.description = description;
        await board.save();

        await board.populate('createdBy', 'name email');
        await board.populate('members', 'name email');

        await Activity.create({
            action: 'board_updated',
            board: board._id,
            user: req.user._id,
            details: { title: board.title },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${board._id}`).emit('board:updated', { board });

        res.json({ board });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/boards/:id - Delete board
router.delete('/:id', auth, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        if (board.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the board owner can delete' });
        }

        await Task.deleteMany({ board: board._id });
        await List.deleteMany({ board: board._id });
        await Activity.deleteMany({ board: board._id });
        await board.deleteOne();

        const io = req.app.get('io');
        if (io) io.to(`board:${board._id}`).emit('board:deleted', { boardId: board._id });

        res.json({ message: 'Board deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/boards/:id/members - Add member
router.post('/:id/members', auth, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        const isMember = board.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Access denied' });

        const { email } = req.body;
        const userToAdd = await User.findOne({ email }).select('name email');
        if (!userToAdd) return res.status(404).json({ message: 'User not found' });

        if (board.members.some(m => m.toString() === userToAdd._id.toString())) {
            return res.status(400).json({ message: 'User is already a member' });
        }

        board.members.push(userToAdd._id);
        await board.save();
        await board.populate('members', 'name email');
        await board.populate('createdBy', 'name email');

        await Activity.create({
            action: 'member_added',
            board: board._id,
            user: req.user._id,
            details: { memberName: userToAdd.name, memberEmail: userToAdd.email },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${board._id}`).emit('member:added', { board, member: userToAdd });

        res.json({ board });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/boards/:id/members/:userId - Remove member
router.delete('/:id/members/:userId', auth, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) return res.status(404).json({ message: 'Board not found' });

        if (board.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the board owner can remove members' });
        }

        if (req.params.userId === board.createdBy.toString()) {
            return res.status(400).json({ message: 'Cannot remove the board owner' });
        }

        board.members = board.members.filter(m => m.toString() !== req.params.userId);
        await board.save();
        await board.populate('members', 'name email');
        await board.populate('createdBy', 'name email');

        await Activity.create({
            action: 'member_removed',
            board: board._id,
            user: req.user._id,
            details: { removedUserId: req.params.userId },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${board._id}`).emit('member:removed', { board, removedUserId: req.params.userId });

        res.json({ board });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/boards/:id/search?q= - Search tasks
router.get('/:id/search', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ tasks: [] });

        const tasks = await Task.find({
            board: req.params.id,
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
            ],
        })
            .populate('assignees', 'name email')
            .limit(20);

        res.json({ tasks });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/boards/:id/activity - Activity log (paginated)
router.get('/:id/activity', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [activities, total] = await Promise.all([
            Activity.find({ board: req.params.id })
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Activity.countDocuments({ board: req.params.id }),
        ]);

        res.json({
            activities,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
