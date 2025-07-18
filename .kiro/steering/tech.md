---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technologies
- **Backend**: Node.js 18+ with TypeScript, Express.js, PostgreSQL + Prisma ORM
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS
- **Real-time**: Socket.io for live updates
- **Authentication**: JWT tokens with bcrypt hashing
- **Validation**: Joi schemas for all API inputs
- **Testing**: Jest with ts-jest, Supertest for API testing

## Code Style Requirements
- **TypeScript**: Strict mode with explicit return types on all functions
- **Variables**: Use `const` over `let`, never `var`
- **Imports**: Use path aliases `@/server`, `@/shared` for clean imports
- **Unused vars**: Prefix with `_` if needed, otherwise remove
- **Formatting**: ESLint + Prettier enforced

## API Conventions
- **Endpoints**: RESTful with `/api/` prefix
- **Errors**: Structured format `{ error: string, code: string, timestamp: Date, path: string }`
- **Auth**: JWT middleware for protected routes
- **Validation**: Joi schemas for all request inputs
- **Response**: Consistent JSON structure with proper HTTP status codes

## Database Patterns
- **Primary Keys**: CUID for all models
- **Timestamps**: `createdAt`, `updatedAt` on all entities
- **Enums**: Use for status fields (`BoardStatus`, `PaymentStatus`, `GameStatus`)
- **Relations**: Cascade deletes for related records
- **Queries**: Use Prisma client with proper error handling

## Testing Standards
- **Structure**: Test files mirror source directory structure
- **Coverage**: Test both success and error scenarios
- **API Tests**: Use Supertest for endpoint integration tests
- **Setup**: Use setup files for configuration and mocks
- **Naming**: Descriptive test names with clear expectations

## Real-time Implementation
- **Events**: Socket.io for board updates, scores, winners
- **Validation**: Validate all socket events and handle errors
- **Reconnection**: Implement automatic reconnection handling
- **Error Handling**: Graceful degradation when real-time fails

## Development Commands
```bash
npm run dev              # Start both frontend and backend
npm test                 # Run Jest tests
npm run lint:fix         # Fix ESLint issues
npm run db:generate      # Generate Prisma client
npm run db:seed          # Seed database
```

## Port Configuration
- Frontend: 3000, Backend: 3001, PostgreSQL: 5432, Redis: 6379