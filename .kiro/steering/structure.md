---
inclusion: always
---

# Project Structure & Architecture

## Directory Organization

### Backend (`amplify/`)
- `backend.ts` - AWS Amplify backend configuration
- `data/` - GraphQL schema and resolvers
- `auth/` - Amplify Auth configuration and custom flows
- `functions/` - Lambda functions for business logic
- `storage/` - File storage configuration
- `api/` - REST API endpoints and GraphQL resolvers

### Frontend (`client/src/`)
- `components/` - React UI components with TypeScript
- `hooks/` - Custom hooks for state management and real-time updates
- `services/` - Amplify API client and GraphQL operations
- `types/` - Shared TypeScript type definitions
- `contexts/` - React context providers (Auth, API)

### Database (`amplify/data/`)
- `resource.ts` - Amplify Data schema definition
- `schema.sql` - Custom SQL for complex queries
- `seed.ts` - Test data generation for development

## Code Style Requirements

### TypeScript Standards
- Strict mode enabled with explicit return types on ALL functions
- Use `const` over `let`, never use `var`
- No unused variables (prefix with `_` if needed, otherwise remove)
- Path aliases: `@/server`, `@/shared` for clean imports
- ESLint + Prettier enforced for consistent formatting

### API Conventions
- GraphQL API with Amplify Data for primary operations
- REST endpoints for specific use cases via Lambda functions
- Structured error responses: `{ error: string, code: string, timestamp: Date, path: string }`
- Amplify Auth for authentication and authorization
- Input validation in resolvers and Lambda functions
- Consistent response structure with proper error handling

### Database Patterns
- Auto-generated IDs for all models (Amplify Data default)
- `createdAt`, `updatedAt` timestamps on all entities
- Enum types for status fields (`BoardStatus`, `PaymentStatus`, `GameStatus`)
- Cascade deletes for related records
- Amplify Data with DynamoDB backend
- Proper error handling for all database operations

## Architecture Patterns

### Real-time Implementation
- Amplify Data subscriptions for live updates (board state, scores, winners)
- GraphQL subscriptions with proper error handling
- Automatic reconnection via Amplify client
- Graceful degradation when real-time features fail

### Testing Standards
- Test files mirror source directory structure exactly
- Jest with ts-jest for TypeScript support
- Amplify testing utilities for GraphQL operations
- Test both success AND error scenarios
- Setup files for configuration and mocks
- Descriptive test names with clear expectations

### Error Handling
- Structured error responses with error codes for client handling
- Console logging for server-side debugging and monitoring
- Include timestamp and path information for traceability
- Graceful error boundaries in React components