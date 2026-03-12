require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const youtubeRoutes = require('./routes/youtube');
const socketHandler = require('./socket');

connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({ 
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true 
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/youtube', youtubeRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: allowedOrigins,
        methods: ['GET', 'POST'], 
        credentials: true 
    },
});

socketHandler(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
