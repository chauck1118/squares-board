---
inclusion: always
---

# Product Overview

March Madness Squares is a web application for managing March Madness tournament betting pools using a 10x10 grid system.

## Core Features

- **User Management**: Registration, authentication, and user profiles
- **Board Management**: Create and manage 100-square betting boards with configurable pricing
- **Square Claiming**: Users can claim 0-10 squares per board with payment tracking
- **Grid Assignment**: Random assignment of squares to grid positions once board is filled
  - Fisher-Yates shuffle algorithm for unbiased randomization
  - Automatic assignment trigger when 100 squares are paid
  - Manual assignment capability for administrators
  - Assignment validation and conflict detection
- **Real-time Updates**: Live score tracking and winner notifications via Socket.io
- **Payment Tracking**: Monitor payment status for each claimed square
- **Tournament Integration**: Support for all 63 March Madness games with round-based payouts
- **Admin Tools**: Payment management, assignment control, and validation utilities

## Business Rules

- Maximum 10 squares per user per board
- Squares are randomly assigned grid positions only after all 100 squares are claimed and paid
- Assignment uses Fisher-Yates shuffle for unbiased randomization of:
  - Grid positions (0-99) assigned to squares
  - Winning numbers (0-9) for top row
  - Losing numbers (0-9) for left column
- Payment tracking with PENDING/PAID status
- Automatic assignment triggers when board reaches 100 paid squares
- Round-based payout structure (Round 1, Round 2, Sweet 16, Elite 8, Final 4, Championship)
- Board lifecycle: OPEN → FILLED → ASSIGNED → ACTIVE → COMPLETED

## Development Guidelines

### Code Style
- Use explicit TypeScript return types for all functions
- Prefer const over let, never use var
- Follow consistent error response format with error codes, messages, and timestamps
- Use CUID for primary keys, timestamps (createdAt, updatedAt) on all models
- Implement proper cascade deletes for related database records

### Architecture Patterns
- RESTful API endpoints under `/api/` prefix
- JWT authentication middleware for protected routes
- Joi validation schemas for all request validation
- Prisma ORM with PostgreSQL for data persistence
- Socket.io for real-time features (board updates, score notifications)
- React Hook Form with Joi validation for frontend forms

### Testing Requirements
- Tests must mirror source directory structure
- Use Jest with ts-jest for TypeScript support
- API endpoints require Supertest integration tests
- Include setup files for test configuration and mocks
- Test both success and error scenarios for all endpoints

### Real-time Features
- Socket.io events for board state changes, score updates, winner notifications
- Automatic reconnection handling for client connections
- Event validation and error handling for socket communications

### Security & Validation
- All API inputs validated with Joi schemas
- JWT tokens for authentication with proper expiration
- bcrypt for password hashing
- Helmet and CORS middleware for security headers
- Input sanitization for user-generated content

## Target Users

- Tournament betting pool organizers
- Participants in March Madness squares pools
- Mobile and desktop users requiring responsive design