const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'board_created', 'board_updated',
            'list_created', 'list_updated', 'list_deleted',
            'task_created', 'task_updated', 'task_deleted', 'task_moved',
            'member_added', 'member_removed',
            'task_assigned', 'task_unassigned',
        ],
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board',
        required: true,
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
});

activitySchema.index({ board: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
