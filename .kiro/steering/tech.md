---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technologies
- **Backend**: AWS Amplify with GraphQL, Lambda functions, DynamoDB
- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS
- **Real-time**: Amplify Data subscriptions for live updates
- **Authentication**: Amplify Auth with built-in security
- **Validation**: Input validation in GraphQL resolvers and Lambda functions
- **Testing**: Jest with ts-jest, Amplify testing utilities

## Code Style Requirements
- **TypeScript**: Strict mode with explicit return types on ALL functions
- **Variables**: Use `const` over `let`, never `var`
- **Imports**: Use path aliases `@/server`, `@/shared` for clean imports
- **Unused vars**: Prefix with `_` if needed, otherwise remove
- **Formatting**: ESLint + Prettier enforced

## API Conventions
- **GraphQL**: Amplify Data with auto-generated schema and resolvers
- **REST**: Lambda functions for specific use cases
- **Errors**: Structured format `{ error: string, code: string, timestamp: Date, path: string }`
- **Auth**: Amplify Auth with authorization rules
- **Validation**: Input validation in resolvers and Lambda functions
- **Response**: Consistent GraphQL response structure with proper error handling

## Database Patterns
- **Primary Keys**: Auto-generated IDs (Amplify Data default)
- **Timestamps**: `createdAt`, `updatedAt` on all entities
- **Enums**: Use for status fields (`BoardStatus`, `PaymentStatus`, `GameStatus`)
- **Relations**: Cascade deletes for related records
- **Queries**: Amplify Data client with proper error handling

## Testing Standards
- **Structure**: Test files mirror source directory structure exactly
- **Coverage**: Test both success AND error scenarios
- **API Tests**: Use Supertest for endpoint integration tests
- **Setup**: Use setup files for configuration and mocks
- **Naming**: Descriptive test names with clear expectations

## Real-time Implementation
- **Subscriptions**: Amplify Data subscriptions for board updates, scores, winners
- **Validation**: Validate ALL GraphQL operations and handle errors
- **Reconnection**: Automatic reconnection via Amplify client
- **Error Handling**: Graceful degradation when real-time fails

## Development Commands
```bash
npm run dev              # Start frontend development server
npx ampx sandbox         # Start Amplify sandbox environment
npm test                 # Run Jest tests
npm run lint:fix         # Fix ESLint issues
npx ampx generate        # Generate Amplify client code
```

## Service Configuration
- Frontend: 3000, Amplify Sandbox: Auto-configured, DynamoDB: Managed by Amplify