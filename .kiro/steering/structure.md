---
inclusion: always
---

# Project Structure & Architecture

## Directory Organization

### Backend (`src/server/`)
- `index.ts` - Express app entry point
- `lib/` - Core configurations (Prisma client)
- `middleware/` - Authentication and request processing
- `routes/` - API endpoints (auth, boards, admin)
- `utils/` - Business logic (auth, assignment algorithms)
- `validation/` - Joi request validation schemas

### Frontend (`client/src/`)
- `components/` - React UI components
- `hooks/` - Custom React hooks for state management
- `services/` - API communication layer
- `types/` - TypeScript definitions
- `contexts/` - React context providers

### Database (`prisma/`)
- `schema.prisma` - Database schema with enums and relations
- `migrations/` - Version-controlled schema changes
- `seed.ts` - Test data generation

## Architecture Patterns

### API Design
- RESTful endpoints with `/api/` prefix
- Consistent error responses: `{ error: string, code: string, timestamp: Date, path: string }`
- JWT authentication middleware for protected routes
- Joi validation for all request inputs
- Explicit TypeScript return types for all functions

### Database Conventions
- CUID primary keys for all models
- Timestamps (`createdAt`, `updatedAt`) on all entities
- Enum types for status fields (`BoardStatus`, `PaymentStatus`, `GameStatus`)
- Cascade deletes for related records
- Prisma ORM with PostgreSQL backend

### Code Style Requirements
- TypeScript strict mode with explicit return types
- `const` over `let`, never `var`
- No unused variables (prefix with `_` if needed)
- ESLint + Prettier for consistent formatting
- Path aliases: `@/server`, `@/shared` for clean imports

### Testing Standards
- Test files mirror source directory structure
- Jest with ts-jest for TypeScript support
- Supertest for API endpoint testing
- Setup files for configuration and mocks
- Test both success and error scenarios

### Real-time Features
- Socket.io for live updates (board state, scores, winners)
- Event validation and error handling
- Automatic reconnection handling

### Error Handling
- Structured error responses with codes for client handling
- Console logging for server-side debugging
- Timestamp and path information for traceability