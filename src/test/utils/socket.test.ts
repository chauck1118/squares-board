import { Server as SocketIOServer } from 'socket.io'
import { createServer } from 'http'
import { AddressInfo } from 'net'
import ioClient from 'socket.io-client'
import jwt from 'jsonwebtoken'
import { setupSocketHandlers, broadcastScoreUpdate, broadcastSquareClaimed, broadcastPaymentConfirmed, broadcastBoardAssigned, broadcastWinnerAnnounced, broadcastBoardStatusChange } from '../../server/utils/socket'
import { prisma } from '../../server/lib/prisma'

describe('Socket.io Real-time Updates', () => {
  let httpServer: any
  let io: SocketIOServer
  let serverSocket: any
  let clientSocket: any
  let port: number
  let testUser: any
  let testAdmin: any
  let testBoard: any

  beforeAll(async () => {
    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'socketuser@test.com',
        displayName: 'Socket User',
        passwordHash: 'hashedpassword',
        isAdmin: false,
      },
    })

    testAdmin = await prisma.user.create({
      data: {
        email: 'socketadmin@test.com',
        displayName: 'Socket Admin',
        passwordHash: 'hashedpassword',
        isAdmin: true,
      },
    })

    // Create test board
    testBoard = await prisma.board.create({
      data: {
        name: 'Socket Test Board',
        pricePerSquare: 10,
      },
    })

    // Setup Socket.io server
    httpServer = createServer()
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })
    setupSocketHandlers(io)

    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as AddressInfo).port
        resolve()
      })
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['socketuser@test.com', 'socketadmin@test.com']
        }
      }
    })
    await prisma.board.delete({ where: { id: testBoard.id } })
    
    io.close()
    httpServer.close()
  })

  beforeEach((done) => {
    // Generate JWT token for test user
    const token = jwt.sign(
      { userId: testUser.id, isAdmin: testUser.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    clientSocket = ioClient(`http://localhost:${port}`, {
      auth: { token }
    })

    io.on('connection', (socket) => {
      serverSocket = socket
    })

    clientSocket.on('connect', done)
  })

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect()
    }
  })

  describe('Authentication', () => {
    it('should authenticate user with valid JWT token', (done) => {
      expect(clientSocket.connected).toBe(true)
      done()
    })

    it('should reject connection with invalid token', (done) => {
      const invalidClient = ioClient(`http://localhost:${port}`, {
        auth: { token: 'invalid-token' }
      })

      invalidClient.on('connect_error', (error: any) => {
        expect(error.message).toContain('Invalid authentication token')
        invalidClient.close()
        done()
      })
    })

    it('should reject connection without token', (done) => {
      const noTokenClient = ioClient(`http://localhost:${port}`)

      noTokenClient.on('connect_error', (error: any) => {
        expect(error.message).toContain('Authentication token required')
        noTokenClient.close()
        done()
      })
    })
  })

  describe('Room Management', () => {
    it('should join board room', (done) => {
      clientSocket.emit('join_board', testBoard.id)
      
      setTimeout(() => {
        expect(serverSocket.rooms.has(`board:${testBoard.id}`)).toBe(true)
        done()
      }, 100)
    })

    it('should leave board room', (done) => {
      clientSocket.emit('join_board', testBoard.id)
      
      setTimeout(() => {
        clientSocket.emit('leave_board', testBoard.id)
        
        setTimeout(() => {
          expect(serverSocket.rooms.has(`board:${testBoard.id}`)).toBe(false)
          done()
        }, 100)
      }, 100)
    })

    it('should handle ping-pong for connection testing', (done) => {
      clientSocket.emit('ping', (response: string) => {
        expect(response).toBe('pong')
        done()
      })
    })
  })

  describe('Score Update Broadcasting', () => {
    it('should broadcast score updates to board users', (done) => {
      const gameData = {
        id: 'game-1',
        gameNumber: 1,
        round: 'Round 1',
        team1: 'Team A',
        team2: 'Team B',
        team1Score: 75,
        team2Score: 68,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString()
      }

      clientSocket.emit('join_board', testBoard.id)

      clientSocket.on('score_update', (data: any) => {
        expect(data.type).toBe('score_update')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.game).toEqual(gameData)
        expect(data.timestamp).toBeDefined()
        done()
      })

      setTimeout(() => {
        broadcastScoreUpdate(io, testBoard.id, gameData)
      }, 100)
    })
  })

  describe('Square Claim Broadcasting', () => {
    it('should broadcast square claims to board users', (done) => {
      const squareData = {
        userId: testUser.id,
        userName: testUser.displayName,
        numberOfSquares: 3,
        totalUserSquares: 3,
        boardName: testBoard.name
      }

      clientSocket.emit('join_board', testBoard.id)

      clientSocket.on('square_claimed', (data: any) => {
        expect(data.type).toBe('square_claimed')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.square).toEqual(squareData)
        expect(data.timestamp).toBeDefined()
        done()
      })

      setTimeout(() => {
        broadcastSquareClaimed(io, testBoard.id, squareData)
      }, 100)
    })
  })

  describe('Payment Confirmation Broadcasting', () => {
    it('should broadcast payment confirmations to board and user', (done) => {
      const squareData = {
        id: 'square-1',
        boardName: testBoard.name,
        user: { id: testUser.id, displayName: testUser.displayName },
        gridPosition: 42,
        paymentStatus: 'PAID'
      }

      let eventsReceived = 0
      const expectedEvents = 2

      clientSocket.emit('join_board', testBoard.id)

      clientSocket.on('payment_confirmed', (data: any) => {
        expect(data.type).toBe('payment_confirmed')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.square).toEqual(squareData)
        eventsReceived++
        if (eventsReceived === expectedEvents) done()
      })

      clientSocket.on('payment_notification', (data: any) => {
        expect(data.type).toBe('payment_confirmed')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.square).toEqual(squareData)
        expect(data.message).toBe('Your square payment has been confirmed')
        eventsReceived++
        if (eventsReceived === expectedEvents) done()
      })

      setTimeout(() => {
        broadcastPaymentConfirmed(io, testBoard.id, testUser.id, squareData)
      }, 100)
    })
  })

  describe('Board Assignment Broadcasting', () => {
    it('should broadcast board assignments to board users', (done) => {
      const assignmentData = {
        assignedSquares: 100,
        winningNumbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        losingNumbers: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
        message: 'Board assignment completed successfully'
      }

      clientSocket.emit('join_board', testBoard.id)

      clientSocket.on('board_assigned', (data: any) => {
        expect(data.type).toBe('board_assigned')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.assignment).toEqual(assignmentData)
        expect(data.timestamp).toBeDefined()
        done()
      })

      setTimeout(() => {
        broadcastBoardAssigned(io, testBoard.id, assignmentData)
      }, 100)
    })
  })

  describe('Winner Announcement Broadcasting', () => {
    it('should broadcast winner announcements to board and winner', (done) => {
      const winnerData = {
        game: {
          id: 'game-1',
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Team A',
          team2: 'Team B',
          team1Score: 75,
          team2Score: 68
        },
        square: {
          id: 'square-1',
          gridPosition: 58,
          winningTeamNumber: 5,
          losingTeamNumber: 8
        },
        user: { id: testUser.id, displayName: testUser.displayName },
        payout: 25
      }

      let eventsReceived = 0
      const expectedEvents = 2

      clientSocket.emit('join_board', testBoard.id)

      clientSocket.on('winner_announced', (data: any) => {
        expect(data.type).toBe('winner_announced')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.winner).toEqual(winnerData)
        eventsReceived++
        if (eventsReceived === expectedEvents) done()
      })

      clientSocket.on('winner_notification', (data: any) => {
        expect(data.type).toBe('winner_announced')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.winner).toEqual(winnerData)
        expect(data.message).toBe('Congratulations! You won $25!')
        eventsReceived++
        if (eventsReceived === expectedEvents) done()
      })

      setTimeout(() => {
        broadcastWinnerAnnounced(io, testBoard.id, winnerData)
      }, 100)
    })
  })

  describe('Board Status Change Broadcasting', () => {
    it('should broadcast board status changes to board users', (done) => {
      const statusData = {
        paidSquares: 100,
        message: 'Board is now filled and ready for assignment'
      }

      clientSocket.emit('join_board', testBoard.id)

      clientSocket.on('board_status_change', (data: any) => {
        expect(data.type).toBe('board_status_change')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.status).toBe('FILLED')
        expect(data.data).toEqual(statusData)
        expect(data.timestamp).toBeDefined()
        done()
      })

      setTimeout(() => {
        broadcastBoardStatusChange(io, testBoard.id, 'FILLED', statusData)
      }, 100)
    })
  })

  describe('Admin Functionality', () => {
    it('should allow admin users to join admin room', (done) => {
      const adminToken = jwt.sign(
        { userId: testAdmin.id, isAdmin: testAdmin.isAdmin },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      )

      const adminClient = ioClient(`http://localhost:${port}`, {
        auth: { token: adminToken }
      })

      io.on('connection', (socket) => {
        setTimeout(() => {
          expect(socket.rooms.has('admin')).toBe(true)
          adminClient.close()
          done()
        }, 100)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid board ID for room joining', (done) => {
      clientSocket.emit('join_board', '')
      clientSocket.emit('join_board', null)
      clientSocket.emit('join_board', undefined)
      
      // Should not crash the server
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true)
        done()
      }, 100)
    })

    it('should handle disconnection gracefully', (done) => {
      clientSocket.disconnect()
      
      setTimeout(() => {
        expect(clientSocket.connected).toBe(false)
        done()
      }, 100)
    })
  })
})