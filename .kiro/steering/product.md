---
inclusion: always
---

# March Madness Squares Product Guide

A web application for managing March Madness tournament betting pools using a 10x10 grid system.

## Core Business Logic

### Square Assignment Rules
- Maximum 10 squares per user per board
- Random assignment occurs ONLY after all 100 squares are claimed AND paid
- Use Fisher-Yates shuffle for unbiased randomization of grid positions (0-99), winning numbers (0-9), and losing numbers (0-9)
- Automatic assignment triggers when board reaches 100 paid squares
- Board lifecycle: OPEN → FILLED → ASSIGNED → ACTIVE → COMPLETED

### Payment & Payout Structure
- Payment status: PENDING/PAID enum values
- Round-based payouts: Round 1, Round 2, Sweet 16, Elite 8, Final 4, Championship
- Support for all 63 March Madness games

## Code Conventions

### TypeScript Requirements
- Explicit return types on ALL functions
- Use `const` over `let`, never `var`
- Strict mode enabled
- No unused variables (prefix with `_` if needed)

### API Standards
- GraphQL API with Amplify Data for primary operations
- REST endpoints for specific use cases via Lambda functions
- Structured error responses: `{ error: string, code: string, timestamp: Date, path: string }`
- Amplify Auth for authentication and authorization
- Input validation in resolvers and Lambda functions

### Database Patterns
- Auto-generated IDs for all models (Amplify Data default)
- `createdAt`, `updatedAt` timestamps on all entities
- Enum types for status fields (`BoardStatus`, `PaymentStatus`, `GameStatus`)
- Cascade deletes for related records
- Amplify Data with DynamoDB backend

### Real-time Implementation
- Amplify Data subscriptions for live updates (board state, scores, winners)
- GraphQL subscriptions with proper error handling
- Automatic reconnection via Amplify client

### Testing Standards
- Test files mirror source directory structure
- Jest with ts-jest for TypeScript
- Supertest for API integration tests
- Test both success AND error scenarios
- Setup files for configuration and mocks

## Architecture Patterns

### Frontend (React + TypeScript)
- React Hook Form with Joi validation
- Tailwind CSS for styling
- Custom hooks for state management
- Context providers for auth and socket connections

### Backend (AWS Amplify)
- Amplify Data with GraphQL schema
- Lambda functions for business logic
- Amplify Auth for user management
- Utils: assignment algorithms, scoring logic
- Structured resolver organization

### Security Requirements
- Amplify Auth with built-in security features
- Input sanitization for user content
- Authorization rules in GraphQL schema
- Validate ALL GraphQL operations and subscriptions