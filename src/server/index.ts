import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from 'dotenv'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import authRoutes from './routes/auth'
import boardRoutes from './routes/boards'
import adminRoutes from './routes/admin'
import { setupSocketHandlers } from './utils/socket'
import { setSocketInstance } from './lib/socket'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

// Load environment variables
config()

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// Basic API route
app.get('/api', (_req, res) => {
  res.json({
    message: 'March Madness Squares API',
    version: '1.0.0',
  })
})

// Authentication routes
app.use('/api/auth', authRoutes)

// Board routes
app.use('/api/boards', boardRoutes)

// Admin routes
app.use('/api/admin', adminRoutes)

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/dist'))
  
  app.get('*', (_req, res) => {
    res.sendFile('index.html', { root: 'client/dist' })
  })
}

// 404 handler for API routes
app.use('/api/*', notFoundHandler)

// Global error handler
app.use(errorHandler)

// Set global socket instance and setup handlers
setSocketInstance(io)
setupSocketHandlers(io)

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`)
    console.log(`🔌 Socket.io server ready`)
  })
}

export { app, server, io }