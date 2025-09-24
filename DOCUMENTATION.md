# Technical Documentation

## 🏗️ Detailed Technical Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js 15    │◄──►│   Express API    │◄──►│   Redis Cache   │
│   Frontend       │    │   + Socket.IO    │    │   + Session     │
│                 │    │   Server         │    │   Storage       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ • React 19      │    │ • Node.js 18+    │    │ • Redis 5.6+    │
│ • TypeScript    │    │ • TypeScript     │    │ • JWT Auth      │
│ • Tailwind CSS  │    │ • Socket.IO 4.8  │    │ • Session Mgmt  │
│ • NextAuth      │    │ • Express 5      │    │ • Real-time DB  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Complete Technology Stack

### Frontend Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Custom component library with Framer Motion
- **State Management**: React hooks with Socket.IO client
- **Authentication**: NextAuth.js with Google OAuth
- **Build Tool**: Next.js built-in bundler
- **Package Manager**: npm

### Backend Technologies
- **Runtime**: Node.js 18+ with Express 5
- **Language**: TypeScript with ESM modules
- **Real-time**: Socket.IO 4.8 with Redis adapter
- **Database**: Redis 5.6+ for caching and sessions
- **Authentication**: JWT tokens with role-based middleware
- **API**: RESTful endpoints with WebSocket events
- **Process Manager**: Built-in clustering support

### DevOps & Testing
- **Load Testing**: Custom Socket.IO and HTTP load testing suite
- **Performance Monitoring**: Real-time metrics and connection tracking
- **Deployment**: Production-ready build scripts and configuration
- **Environment Management**: Multi-environment configuration
- **Testing Tools**: Artillery, custom Node.js test scripts

## 📁 Detailed Project Structure

```
lottery/
├── frontend/                 # Next.js Frontend Application
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── admin/       # Admin dashboard page
│   │   │   ├── api/         # NextAuth API routes
│   │   │   ├── login/       # Authentication page
│   │   │   ├── play/        # Player game interface
│   │   │   ├── show/        # Display screen interface
│   │   │   ├── globals.css  # Global styles
│   │   │   ├── layout.tsx   # Root layout component
│   │   │   └── page.tsx     # Home page
│   │   ├── components/      # React Components
│   │   │   ├── game/        # Game-specific components
│   │   │   ├── ui/          # Reusable UI components
│   │   │   └── Providers.tsx # Context providers
│   │   ├── lib/             # Frontend Utilities
│   │   │   ├── auth.ts      # NextAuth configuration
│   │   │   ├── redis-adapter.ts # Custom Redis adapter
│   │   │   └── utils.ts     # Utility functions
│   │   └── types/           # TypeScript Type Definitions
│   ├── public/              # Static Assets
│   ├── package.json         # Frontend Dependencies
│   └── .env.local           # Frontend Environment Variables
├── backend/                 # Node.js + Socket.IO Backend
│   ├── src/
│   │   ├── lib/             # Backend Core Logic
│   │   │   ├── game.ts      # Game state management
│   │   │   ├── redis.ts     # Redis operations
│   │   │   └── socket.ts    # Socket.IO event handling
│   │   ├── routes/          # Express API Routes
│   │   │   ├── admin.ts     # Admin API endpoints
│   │   │   └── submit-answer.ts # Game API endpoints
│   │   ├── scripts/         # Management Scripts
│   │   │   └── manage-display-users.ts # User management
│   │   ├── types/           # Backend type definitions
│   │   └── index.ts         # Server entry point
│   ├── dist/                # Compiled JavaScript
│   ├── package.json         # Backend Dependencies
│   └── .env                 # Backend Environment Variables
└── flood-test/              # Load Testing Suite
    ├── load-test.js         # Socket.IO load testing
    ├── http-test.js         # HTTP API load testing
    ├── heavy-load-test.js   # Stress testing scenarios
    ├── login-test.js        # Authentication load testing
    ├── submit-answer-test.js # Game action load testing
    ├── connected-users.json # Test user data
    └── package.json         # Testing dependencies
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+ 
- Redis Server 5.6+
- Google OAuth credentials
- Modern web browser

### Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Backend (.env)
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
DEFAULT_ROOM_ID=main_room
```

### Installation & Setup

#### 1. Clone Repository
```bash
git clone [repository-url]
cd lottery
```

#### 2. Backend Setup
```bash
cd backend
npm install
npm run build
npm run dev
```

#### 3. Frontend Setup (New Terminal)
```bash
cd frontend
npm install
npm run dev
```

#### 4. Redis Setup
```bash
# Install Redis (macOS)
brew install redis
redis-server

# Install Redis (Ubuntu)
sudo apt install redis-server
sudo systemctl start redis
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

## 📡 API Documentation

### Authentication Endpoints
- `GET /api/auth/signin` - Google OAuth sign-in
- `GET /api/auth/signout` - User sign-out
- `GET /api/auth/session` - Get current session

### Game API Endpoints
- `POST /api/submit-answer` - Submit player answer
- `GET /api/admin/game-stats` - Get game statistics (Admin only)
- `POST /api/admin/next-question` - Publish next question (Admin only)
- `POST /api/admin/reset-game` - Reset game state (Admin only)

### WebSocket Events

#### Client → Server
- `join` - Join game room
- `answer` - Submit answer
- `admin_start_game` - Start new game (Admin)
- `admin_next_question` - Next question (Admin)
- `admin_reset_game` - Reset game (Admin)

#### Server → Client
- `game_state` - Current game state
- `player_count_update` - Live player count
- `new_question` - New question broadcast
- `round_result` - Round results
- `eliminated` - Player elimination
- `winner` - Game winner
- `tie` - Tie situation
- `countdown_update` - Timer updates

## 🧪 Load Testing

### Test Scenarios

#### 1. Socket.IO Connection Test
```bash
cd flood-test
node load-test.js
```
- **Purpose**: Test WebSocket connections
- **Metrics**: Connection success rate, message throughput
- **Configuration**: 50 concurrent users, 30-second duration

#### 2. Heavy Load Test
```bash
node heavy-load-test.js
```
- **Purpose**: Stress test with high concurrency
- **Metrics**: 200 concurrent users, connection times, error rates
- **Configuration**: 60-second duration, 20 users/second arrival rate

#### 3. HTTP API Test
```bash
node http-test.js
```
- **Purpose**: Test REST API endpoints
- **Metrics**: Response times, throughput, error rates
- **Configuration**: 50 concurrent requests, 30-second duration

#### 4. Authentication Test
```bash
node login-test.js
```
- **Purpose**: Test authentication flow
- **Metrics**: Login success rate, session creation
- **Configuration**: Multiple OAuth scenarios

### Performance Benchmarks
- **Concurrent Users**: 200+ successfully tested
- **Response Time**: P99 < 100ms
- **Connection Success Rate**: 99.5%
- **Message Throughput**: 1000+ messages/second
- **Memory Usage**: < 512MB under full load

## 🔍 Game Logic Implementation

### Game State Management
```typescript
interface GameState {
  gameStarted: boolean;
  currentRound: number;
  currentQuestion: MinorityQuestion | null;
  timeLeft: number;
  survivorsCount: number;
  eliminatedCount: number;
  winner: string | null;
  userAnswer: string | null;
}
```

### Redis Data Model
```
# Game State
game:{roomId}:state          # Game configuration (Hash)
game:{roomId}:round          # Current round number (String)
game:{roomId}:winner         # Winner email (String)
game:{roomId}:started        # Game started flag (String)

# Room Data
room:{roomId}:survivors      # Active players (Set)
room:{roomId}:eliminated     # Eliminated players (Set)

# Question Data
current_question:{roomId}    # Current question data (Hash)
user:{email}:answer:{qid}    # User answers (String)

# User Sessions
user:{email}:session         # User session data (Hash)
user:{email}:online          # Online status with TTL (String)

# Admin Data
admin:emails                 # Admin email addresses (Set)
display:emails               # Display screen emails (Set)
```

### Authentication Flow
1. User clicks "Sign in with Google"
2. NextAuth.js handles OAuth flow
3. JWT token created with role information
4. Redis adapter stores session data
5. Middleware validates protected routes
6. Socket.IO authenticates using JWT

## 🚀 Production Deployment

### Build Process
```bash
# Backend build
cd backend
npm run build

# Frontend build
cd frontend
npm run build
```

### Production Environment
```bash
# Start backend
cd backend
npm start

# Start frontend
cd frontend
npm start
```

### Scaling Considerations
- **Horizontal Scaling**: Stateless backend design
- **Redis Clustering**: For high availability
- **Load Balancing**: Nginx or cloud load balancer
- **CDN**: Static asset delivery
- **Monitoring**: Application performance monitoring

## 🐛 Troubleshooting

### Common Issues

#### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping
# Should return "PONG"

# Check Redis logs
redis-cli monitor
```

#### Socket.IO Connection Problems
```bash
# Check CORS configuration
# Verify FRONTEND_URL environment variable
# Test WebSocket connectivity
```

#### Authentication Issues
```bash
# Verify Google OAuth credentials
# Check NEXTAUTH_SECRET configuration
# Validate JWT_SECRET matching
```

### Debug Commands
```bash
# Backend logs
npm run dev # Shows detailed logs

# Redis debugging
redis-cli --scan --pattern "game:*"

# Frontend debugging
# Use browser developer tools
# Check Network tab for API calls
# Monitor Console for errors
```

## 📊 Monitoring & Analytics

### Key Metrics
- **Active Connections**: Real-time WebSocket connections
- **Game Sessions**: Active game rounds
- **User Engagement**: Player participation rates
- **System Performance**: Response times, error rates
- **Resource Usage**: Memory, CPU, Redis memory

### Logging
- **Structured Logging**: JSON format for easy parsing
- **Error Tracking**: Comprehensive error capture
- **Performance Monitoring**: Request/response timing
- **User Activity**: Authentication and game actions
