# March Madness Squares

A responsive web application for managing March Madness squares betting pools.

## Features

- User registration and authentication
- Board creation and management
- Square claiming (0-10 squares per user)
- Random square assignment
- Real-time score updates
- Payment tracking
- Mobile-responsive design

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Vite for build tooling
- Socket.io for real-time updates

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL with Prisma ORM
- Redis for caching
- Socket.io for real-time communication

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (recommended)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd march-madness-squares
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start with Docker (Recommended)**
   ```bash
   docker-compose up -d
   ```
   This starts:
   - App server on http://localhost:3001
   - React dev server on http://localhost:3000
   - PostgreSQL on port 5432
   - Redis on port 6379
   - Adminer (DB admin) on http://localhost:8080

5. **Or start manually**
   ```bash
   # Start PostgreSQL and Redis separately
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
├── src/
│   ├── server/             # Express backend
│   ├── shared/             # Shared types/utilities
│   └── test/               # Test setup
├── scripts/                # Database scripts
├── docker-compose.yml      # Development environment
├── Dockerfile              # Production build
└── Dockerfile.dev          # Development build
```

## Development

The application is set up with:
- Hot reloading for both frontend and backend
- TypeScript for type safety
- ESLint and Prettier for code quality
- Jest for testing
- Docker for consistent development environment

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## License

MIT