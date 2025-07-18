import request from 'supertest'
import { Server as SocketIOServer } from 'socket.io'
import { createServer } from 'http'
import { AddressInfo } from 'net'
import ioClient from 'socket.io-client'
import jwt from 'jsonwebtoken'
import { app } from '../../server/index'
import { setupSocketHandlers } from '../../server/utils/socket'
import { setSocketInstance } from '../../server/lib/socket'
import { prisma } from '../../server/lib/prisma'

describe('Real-time Events Integration', () => {
  let httpServer: any
  let io: SocketIOServer
  let clientSocket: any
  let port: number
  let testUser: any
  let testAdmin: any
  let testBoard: any
  let userToken: string
  let adminToken: string

  beforeAll(async () => {
    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'realtimeuser@test.com',
        displayName: 'Realtime User',
        passwordHash: 'hashedpassword',
        isAdmin: false,
      },
    })

    testAdmin = await prisma.user.create({
      data: {
        email: 'realtimeadmin@test.com',
        displayName: 'Realtime Admin',
        passwordHash: 'hashedpassword',
        isAdmin: true,
      },
    })

    // Generate tokens
    userToken = jwt.sign(
      { userId: testUser.id, isAdmin: testUser.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    adminToken = jwt.sign(
      { userId: testAdmin.id, isAdmin: testAdmin.isAdmin },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    // Create test board
    testBoard = await prisma.board.create({
      data: {
        name: 'Realtime Test Board',
        pricePerSquare: 10,
      },
    })

    // Setup Socket.io server for testing
    httpServer = createServer()
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })
    setSocketInstance(io)
    setupSocketHandlers(io)

    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as AddressInfo).port
        resolve()
      })
    })
  })

  afterAll(async () => {
    await prisma.square.deleteMany({ where: { boardId: testBoard.id } })
    await prisma.game.deleteMany({ where: { boardId: testBoard.id } })
    await prisma.payoutStructure.deleteMany({ where: { boardId: testBoard.id } })
    await prisma.board.delete({ where: { id: testBoard.id } })
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['realtimeuser@test.com', 'realtimeadmin@test.com']
        }
      }
    })
    
    io.close()
    httpServer.close()
  })

  beforeEach((done) => {
    clientSocket = ioClient(`http://localhost:${port}`, {
      auth: { token: userToken }
    })
    clientSocket.on('connect', done)
  })

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect()
    }
  })

  describe('Square Claiming Real-time Events', () => {
    it('should broadcast square claim when user claims squares via API', (done) => {
      clientSocket.emit('join_board', testBoard.id)

      clientSocket.on('square_claimed', (data: any) => {
        expect(data.type).toBe('square_claimed')
        expect(data.boardId).toBe(testBoard.id)
        expect(data.square.userId).toBe(testUser.id)
        expect(data.square.numberOfSquares).toBe(5)
        expect(data.timestamp).toBeDefined()
        done()
      })

      // Make API request to claim squares
      setTimeout(() => {
        request(app)
          .post(`/api/boards/${testBoard.id}/claim`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ numberOfSquares: 5 })
          .expect(201)
          .end((err) => {
            if (err) done(err)
          })
      }, 100)
    })
  })

  describe('Payment Confirmation Real-time Events', () => {
    it('should broadcast payment confirmation when admin marks square as paid', (done) => {
      // First create a square to mark as paid
      request(app)
        .post(`/api/boards/${testBoard.id}/claim`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ numberOfSquares: 1 })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)

          const squareId = res.body.squares[0].id
          
          clientSocket.emit('join_board', testBoard.id)

          let eventsReceived = 0
          const expectedEvents = 2

          clientSocket.on('payment_confirmed', (data: any) => {
            expect(data.type).toBe('payment_confirmed')
            expect(data.boardId).toBe(testBoard.id)
            expect(data.square.paymentStatus).toBe('PAID')
            eventsReceived++
            if (eventsReceived === expectedEvents) done()
          })

          clientSocket.on('payment_notification', (data: any) => {
            expect(data.type).toBe('payment_confirmed')
            expect(data.message).toBe('Your square payment has been confirmed')
            eventsReceived++
            if (eventsReceived === expectedEvents) done()
          })

          // Mark square as paid via admin API
          setTimeout(() => {
            request(app)
              .put(`/api/admin/squares/${squareId}/payment`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ paymentStatus: 'PAID' })
              .expect(200)
              .end((err) => {
                if (err) done(err)
              })
          }, 100)
        })
    })
  })

  describe('Game Score Update Real-time Events', () => {
    it('should broadcast score updates when admin updates game scores', (done) => {
      // First create a game
      request(app)
        .post(`/api/admin/boards/${testBoard.id}/games`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gameNumber: 1,
          round: 'Round 1',
          team1: 'Duke',
          team2: 'UNC',
          scheduledTime: new Date().toISOString()
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)

          const gameId = res.body.game.id
          
          clientSocket.emit('join_board', testBoard.id)

          clientSocket.on('score_update', (data: any) => {
            expect(data.type).toBe('score_update')
            expect(data.boardId).toBe(testBoard.id)
            expect(data.game.team1Score).toBe(78)
            expect(data.game.team2Score).toBe(74)
            expect(data.game.status).toBe('COMPLETED')
            done()
          })

          // Update game score via admin API
          setTimeout(() => {
            request(app)
              .put(`/api/admin/games/${gameId}/score`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({
                team1Score: 78,
                team2Score: 74,
                status: 'COMPLETED'
              })
              .expect(200)
              .end((err) => {
                if (err) done(err)
              })
          }, 100)
        })
    })
  })

  describe('Board Assignment Real-time Events', () => {
    it('should broadcast board assignment when admin triggers assignment', (done) => {
      // Create 100 paid squares to fill the board
      const createSquares = async () => {
        const squares = []
        for (let i = 0; i < 100; i++) {
          squares.push({
            boardId: testBoard.id,
            userId: testUser.id,
            paymentStatus: 'PAID' as const,
          })
        }
        await prisma.square.createMany({ data: squares })
      }

      createSquares().then(() => {
        clientSocket.emit('join_board', testBoard.id)

        clientSocket.on('board_assigned', (data: any) => {
          expect(data.type).toBe('board_assigned')
          expect(data.boardId).toBe(testBoard.id)
          expect(data.assignment.assignedSquares).toBe(100)
          expect(data.assignment.winningNumbers).toHaveLength(10)
          expect(data.assignment.losingNumbers).toHaveLength(10)
          done()
        })

        // Trigger assignment via admin API
        setTimeout(() => {
          request(app)
            .post(`/api/admin/boards/${testBoard.id}/assign`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200)
            .end((err) => {
              if (err) done(err)
            })
        }, 100)
      })
    })
  })

  describe('Board Status Change Real-time Events', () => {
    it('should broadcast board status change when board becomes filled', (done) => {
      // Create a new board for this test
      request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Status Change Test Board',
          pricePerSquare: 10,
          payoutStructure: {
            round1: 25,
            round2: 50,
            sweet16: 100,
            elite8: 200,
            final4: 400,
            championship: 800
          }
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err)

          const newBoardId = res.body.board.id
          
          // Create 99 paid squares
          const createSquares = async () => {
            const squares = []
            for (let i = 0; i < 99; i++) {
              squares.push({
                boardId: newBoardId,
                userId: testUser.id,
                paymentStatus: 'PAID' as const,
              })
            }
            await prisma.square.createMany({ data: squares })
          }

          createSquares().then(() => {
            // Create one pending square
            request(app)
              .post(`/api/boards/${newBoardId}/claim`)
              .set('Authorization', `Bearer ${userToken}`)
              .send({ numberOfSquares: 1 })
              .expect(201)
              .end((err, res) => {
                if (err) return done(err)

                const squareId = res.body.squares[0].id
                
                clientSocket.emit('join_board', newBoardId)

                clientSocket.on('board_status_change', (data: any) => {
                  expect(data.type).toBe('board_status_change')
                  expect(data.boardId).toBe(newBoardId)
                  expect(data.status).toBe('FILLED')
                  expect(data.data.paidSquares).toBe(100)
                  
                  // Clean up
                  prisma.square.deleteMany({ where: { boardId: newBoardId } })
                    .then(() => prisma.payoutStructure.deleteMany({ where: { boardId: newBoardId } }))
                    .then(() => prisma.board.delete({ where: { id: newBoardId } }))
                    .then(() => done())
                })

                // Mark the last square as paid to trigger status change
                setTimeout(() => {
                  request(app)
                    .put(`/api/admin/squares/${squareId}/payment`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ paymentStatus: 'PAID' })
                    .expect(200)
                    .end((err) => {
                      if (err) done(err)
                    })
                }, 100)
              })
          })
        })
    })
  })

  describe('Connection Management', () => {
    it('should handle multiple clients connecting to same board', (done) => {
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: userToken }
      })

      let connectionsReady = 0
      const checkReady = () => {
        connectionsReady++
        if (connectionsReady === 2) {
          // Both clients join the same board
          clientSocket.emit('join_board', testBoard.id)
          client2.emit('join_board', testBoard.id)

          let eventsReceived = 0
          const expectedEvents = 2

          const eventHandler = (data: any) => {
            expect(data.type).toBe('square_claimed')
            eventsReceived++
            if (eventsReceived === expectedEvents) {
              client2.close()
              done()
            }
          }

          clientSocket.on('square_claimed', eventHandler)
          client2.on('square_claimed', eventHandler)

          // Trigger an event that should reach both clients
          setTimeout(() => {
            request(app)
              .post(`/api/boards/${testBoard.id}/claim`)
              .set('Authorization', `Bearer ${userToken}`)
              .send({ numberOfSquares: 2 })
              .expect(201)
              .end((err) => {
                if (err) done(err)
              })
          }, 200)
        }
      }

      clientSocket.on('connect', checkReady)
      client2.on('connect', checkReady)
    })

    it('should handle client disconnection gracefully', (done) => {
      clientSocket.emit('join_board', testBoard.id)
      
      setTimeout(() => {
        clientSocket.disconnect()
        
        // Server should continue working after client disconnects
        setTimeout(() => {
          const newClient = ioClient(`http://localhost:${port}`, {
            auth: { token: userToken }
          })
          
          newClient.on('connect', () => {
            expect(newClient.connected).toBe(true)
            newClient.close()
            done()
          })
        }, 100)
      }, 100)
    })
  })
})