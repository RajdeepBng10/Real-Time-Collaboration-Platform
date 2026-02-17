require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Board = require('./models/Board');
const List = require('./models/List');
const Task = require('./models/Task');
const Activity = require('./models/Activity');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Board.deleteMany({});
        await List.deleteMany({});
        await Task.deleteMany({});
        await Activity.deleteMany({});
        console.log('Cleared existing data');

        // Create demo users
        const user1 = await User.create({
            name: 'Demo User',
            email: 'demo@example.com',
            password: 'password123',
        });

        const user2 = await User.create({
            name: 'Jane Smith',
            email: 'demo2@example.com',
            password: 'password123',
        });

        console.log('Created demo users');

        // Create a board
        const board = await Board.create({
            title: 'Project Alpha',
            description: 'Main project board for tracking development tasks',
            createdBy: user1._id,
            members: [user1._id, user2._id],
        });

        // Create lists
        const lists = await List.create([
            { title: 'Backlog', position: 0, board: board._id },
            { title: 'To Do', position: 1, board: board._id },
            { title: 'In Progress', position: 2, board: board._id },
            { title: 'Done', position: 3, board: board._id },
        ]);

        console.log('Created board and lists');

        // Create tasks
        const tasks = [
            { title: 'Design database schema', description: 'Create ER diagram and define relationships', position: 0, list: lists[3]._id, board: board._id, assignees: [user1._id], priority: 'high' },
            { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated testing and deployment', position: 1, list: lists[0]._id, board: board._id, priority: 'medium' },
            { title: 'Implement user authentication', description: 'JWT-based auth with signup and login', position: 0, list: lists[2]._id, board: board._id, assignees: [user1._id], priority: 'high' },
            { title: 'Create REST API endpoints', description: 'Build CRUD APIs for boards, lists, and tasks', position: 1, list: lists[2]._id, board: board._id, assignees: [user1._id, user2._id], priority: 'high' },
            { title: 'Build Kanban board UI', description: 'React component with drag-and-drop support', position: 0, list: lists[1]._id, board: board._id, assignees: [user2._id], priority: 'urgent' },
            { title: 'Add real-time sync', description: 'Socket.IO integration for live updates', position: 1, list: lists[1]._id, board: board._id, priority: 'high' },
            { title: 'Write unit tests', description: 'Test coverage for API endpoints', position: 0, list: lists[0]._id, board: board._id, priority: 'medium' },
            { title: 'Deploy to production', description: 'Set up hosting and deploy the application', position: 2, list: lists[0]._id, board: board._id, priority: 'low' },
        ];

        await Task.create(tasks);
        console.log('Created tasks');

        // Create activity entries
        await Activity.create([
            { action: 'board_created', board: board._id, user: user1._id, details: { title: board.title } },
            { action: 'member_added', board: board._id, user: user1._id, details: { memberName: user2.name } },
            { action: 'task_created', board: board._id, user: user1._id, details: { title: 'Design database schema' } },
            { action: 'task_created', board: board._id, user: user1._id, details: { title: 'Implement user authentication' } },
            { action: 'task_moved', board: board._id, user: user1._id, details: { title: 'Design database schema', from: 'To Do', to: 'Done' } },
        ]);

        console.log('Created activity history');
        console.log('\n--- Demo Credentials ---');
        console.log('Email: demo@example.com  |  Password: password123');
        console.log('Email: demo2@example.com |  Password: password123');
        console.log('------------------------\n');

        await mongoose.connection.close();
        console.log('Seed complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seed();
