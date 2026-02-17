const express = require('express');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const List = require('../models/List');
const Board = require('../models/Board');
const Activity = require('../models/Activity');

const router = express.Router();

// POST /api/lists/:listId/tasks - Create task
router.post('/lists/:listId/tasks', auth, async (req, res) => {
    try {
        const list = await List.findById(req.params.listId);
        if (!list) return res.status(404).json({ message: 'List not found' });

        const board = await Board.findById(list.board);
        const isMember = board.members.some(m => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: 'Access denied' });

        const { title, description, priority, dueDate } = req.body;
        if (!title) return res.status(400).json({ message: 'Task title is required' });

        const maxPosition = await Task.findOne({ list: list._id }).sort({ position: -1 });
        const position = maxPosition ? maxPosition.position + 1 : 0;

        const task = await Task.create({
            title,
            description: description || '',
            position,
            list: list._id,
            board: board._id,
            priority: priority || 'medium',
            dueDate: dueDate || null,
        });

        await task.populate('assignees', 'name email');

        await Activity.create({
            action: 'task_created',
            board: board._id,
            task: task._id,
            user: req.user._id,
            details: { title: task.title, listTitle: list.title },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${board._id}`).emit('task:created', { task });

        res.status(201).json({ task });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/tasks/:id - Update task
router.put('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { title, description, priority, dueDate } = req.body;
        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (priority !== undefined) task.priority = priority;
        if (dueDate !== undefined) task.dueDate = dueDate;
        await task.save();
        await task.populate('assignees', 'name email');

        await Activity.create({
            action: 'task_updated',
            board: task.board,
            task: task._id,
            user: req.user._id,
            details: { title: task.title },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${task.board}`).emit('task:updated', { task });

        res.json({ task });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const boardId = task.board;
        const listId = task.list;
        await task.deleteOne();

        await Activity.create({
            action: 'task_deleted',
            board: boardId,
            user: req.user._id,
            details: { title: task.title },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${boardId}`).emit('task:deleted', { taskId: task._id, listId });

        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/tasks/:id/move - Move task to different list/position
router.put('/tasks/:id/move', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { listId, position } = req.body;
        const sourceListId = task.list.toString();
        const destListId = listId || sourceListId;

        // Update positions of other tasks in source list
        if (sourceListId !== destListId) {
            await Task.updateMany(
                { list: sourceListId, position: { $gt: task.position } },
                { $inc: { position: -1 } }
            );
        }

        // Make room in destination list
        await Task.updateMany(
            { list: destListId, position: { $gte: position } },
            { $inc: { position: 1 } }
        );

        task.list = destListId;
        task.position = position;
        await task.save();
        await task.populate('assignees', 'name email');

        const sourceList = await List.findById(sourceListId);
        const destList = await List.findById(destListId);

        await Activity.create({
            action: 'task_moved',
            board: task.board,
            task: task._id,
            user: req.user._id,
            details: {
                title: task.title,
                from: sourceList ? sourceList.title : 'unknown',
                to: destList ? destList.title : 'unknown',
            },
        });

        const io = req.app.get('io');
        if (io) {
            io.to(`board:${task.board}`).emit('task:moved', {
                task,
                sourceListId,
                destListId,
                position,
            });
        }

        res.json({ task });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/tasks/:id/assign - Assign user
router.put('/tasks/:id/assign', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { userId } = req.body;
        if (task.assignees.some(a => a.toString() === userId)) {
            return res.status(400).json({ message: 'User already assigned' });
        }

        task.assignees.push(userId);
        await task.save();
        await task.populate('assignees', 'name email');

        await Activity.create({
            action: 'task_assigned',
            board: task.board,
            task: task._id,
            user: req.user._id,
            details: { title: task.title, assignedUserId: userId },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${task.board}`).emit('task:updated', { task });

        res.json({ task });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/tasks/:id/unassign - Unassign user
router.put('/tasks/:id/unassign', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { userId } = req.body;
        task.assignees = task.assignees.filter(a => a.toString() !== userId);
        await task.save();
        await task.populate('assignees', 'name email');

        await Activity.create({
            action: 'task_unassigned',
            board: task.board,
            task: task._id,
            user: req.user._id,
            details: { title: task.title, unassignedUserId: userId },
        });

        const io = req.app.get('io');
        if (io) io.to(`board:${task.board}`).emit('task:updated', { task });

        res.json({ task });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
