const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../index');
const User = require('../models/User');

// Use a separate test database
beforeAll(async () => {
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
    await User.deleteMany({ email: /test-/ });
    await mongoose.connection.close();
});

describe('Auth API', () => {
    const testUser = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
    };
    let token;

    describe('POST /api/auth/signup', () => {
        it('should create a new user', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send(testUser);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('name', testUser.name);
            expect(res.body.user).toHaveProperty('email', testUser.email);
            expect(res.body.user).not.toHaveProperty('password');
            token = res.body.token;
        });

        it('should not create a duplicate user', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send(testUser);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already exists/i);
        });

        it('should validate required fields', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'a@b.com' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('should reject invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'wrongpassword' });

            expect(res.status).toBe(400);
        });

        it('should reject non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@example.com', password: 'password123' });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return current user with valid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('should reject request without token', async () => {
            const res = await request(app)
                .get('/api/auth/me');

            expect(res.status).toBe(401);
        });
    });
});
