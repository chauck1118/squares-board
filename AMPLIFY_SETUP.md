# AWS Amplify Setup for March Madness Squares

This document describes the AWS Amplify configuration for the March Madness Squares application.

## Architecture Overview

The application uses AWS Amplify Gen 2 with the following services:
- **AWS Cognito**: User authentication and authorization
- **AWS AppSync**: GraphQL API with real-time subscriptions
- **Amazon DynamoDB**: NoSQL database for data storage
- **AWS Amplify Hosting**: Frontend deployment and CI/CD

## Project Structure

```
amplify/
├── auth/
│   └── resource.ts          # Cognito user pool configuration
├── data/
│   └── resource.ts          # GraphQL schema and DynamoDB models
├── backend.ts               # Backend configuration
├── package.json             # Amplify dependencies
└── tsconfig.json           # TypeScript configuration

client/src/
├── services/
│   ├── amplify-client.ts    # GraphQL client
│   └── auth.ts             # Authentication service
└── amplify-config.ts       # Amplify configuration
```

## Data Models

### User
- Email-based authentication with display name
- Admin role support through Cognito groups
- Custom attributes for display name and admin status

### Board
- March Madness squares board with 100 squares
- Status tracking: OPEN → FILLED → ASSIGNED → ACTIVE → COMPLETED
- Payout structure configuration
- Random number assignment for grid

### Square
- Individual squares on a board (0-99 positions)
- Payment status tracking (PENDING/PAID)
- User ownership and claim order
- Random number assignments for winning/losing teams

### Game
- Tournament games (1-63 for March Madness)
- Score tracking and winner determination
- Round-based organization
- Real-time updates via subscriptions

## Authentication Configuration

- Email-based login with AWS Cognito
- Custom user attributes for display name and admin status
- Admin group for privileged operations
- JWT token-based authorization

## GraphQL API

- Type-safe operations with generated TypeScript types
- Real-time subscriptions for live updates
- Authorization rules based on user ownership and admin groups
- Automatic DynamoDB table creation and management

## Development Commands

```bash
# Start Amplify sandbox environment
npm run amplify:sandbox

# Generate TypeScript types from GraphQL schema
npm run amplify:generate

# Deploy to AWS (production)
npm run amplify:deploy

# Start development with Amplify sandbox
npm run dev
```

## Environment Setup

1. Configure AWS credentials:
   ```bash
   npx ampx configure profile
   ```

2. Start sandbox environment:
   ```bash
   npx ampx sandbox
   ```

3. Generate client types:
   ```bash
   npx ampx generate
   ```

## Security Features

- Automatic HTTPS/TLS encryption
- Input validation through GraphQL schema
- Rate limiting and DDoS protection
- Fine-grained authorization rules
- Secure credential management

## Real-time Features

- Board updates (square claims, payments)
- Score updates during tournament
- Winner notifications
- Payment confirmations
- Automatic reconnection handling

## Deployment

The application is configured for automatic deployment to AWS Amplify Hosting:
- Frontend build: `client/dist`
- Automatic CI/CD pipeline
- Environment-based configuration
- Global CDN distribution

## Next Steps

1. Configure AWS credentials for deployment
2. Test authentication flows
3. Implement GraphQL operations
4. Add real-time subscriptions
5. Deploy to production environment