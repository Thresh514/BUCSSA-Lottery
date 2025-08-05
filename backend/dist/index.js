import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { initializeSocketIO } from './lib/socket.js';
import submitAnswerRoutes from './routes/submit-answer.js';
import adminRoutes from './routes/admin.js';
const app = express();
const server = createServer(app);
const io = initializeSocketIO(server);
const PORT = process.env.PORT || 4000;
// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes
app.use('/api/submit-answer', submitAnswerRoutes);
app.use('/api/admin', adminRoutes);
// Start the server
server.listen(PORT, () => {
    console.log(`🚀 Minority Game Backend is running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO server is ready`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
// Optional: Add error handling
server.on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});
// Optional: Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map