# TouchCare Benefits Platform

A comprehensive, AI-powered benefits enrollment platform that helps employees understand and select the best health insurance plans for their needs.

## 🎯 Overview

TouchCare Benefits Platform provides two distinct enrollment experiences:
- **Counselor Mode**: Guided, audio-assisted walkthrough with AI chatbot support
- **Go Mode**: Self-service experience for users who want to move quickly

## ✨ Features

### Core Features
- **Personalized Recommendations**: AI-powered plan recommendations based on user profile
- **Dual-Mode Interface**: Counselor (guided) and Go (self-service) modes
- **Real-Time Cost Estimates**: Typical year vs. worst-case scenario comparisons
- **HSA Calculator**: Interactive tax savings calculator for HSA-eligible plans
- **Gap Analysis**: Voluntary benefits recommendations based on user profile
- **Spouse Collaboration**: Real-time spouse comparison via WebSocket

### AI-Powered Features
- **Conversational Chatbot**: Claude-powered benefits counselor
- **Audio Guidance**: ElevenLabs voice synthesis for step-by-step guidance
- **Prescription Lookup**: RxNorm integration for medication tier lookup

### Admin Portal
- **Dashboard**: Plan management, user insights, and enrollment metrics
- **A/B Testing**: Built-in experimentation framework
- **Funnel Analytics**: Track user journey and drop-off points

## 🛠 Tech Stack

### Backend
- Node.js 20+, Express.js, TypeScript
- PostgreSQL 15, Socket.io, JWT/bcrypt
- Zod validation, Winston logging

### Frontend
- React 18, TypeScript, Vite 5
- Tailwind CSS 3.4, Zustand, i18next
- Framer Motion, Recharts

### External Services
- Anthropic Claude API (AI Chat)
- ElevenLabs API (Voice)
- RxNorm API (Prescriptions)
- PDFKit (PDF Generation)

## 🚀 Quick Start

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up environment variables (see .env.example)

# Start development servers
cd backend && npm run dev
cd frontend && npm run dev
```

## 📖 Documentation

- API docs available at `/api/docs` when running backend
- Full documentation in /docs directory

---

# TouchCare Benefits Platform (Original)

A comprehensive employee benefits decision support platform that helps employees choose the right health insurance plan through an intelligent, guided experience.

## 🌟 Features

### Employee Experience
- **Dual-Mode Interface**: Choose between "Counselor" (audio-guided) or "Go" (self-directed) modes
- **Intelligent Profile Builder**: Step-by-step questions to understand healthcare needs
- **AI-Powered Recommendations**: Personalized plan recommendations with cost projections
- **HSA Calculator**: Interactive tool for calculating HSA tax benefits
- **Plan Comparison**: Side-by-side comparison of up to 3 plans
- **Gap Analysis**: Recommendations for voluntary benefits (accident, critical illness, life)
- **PDF Export**: Download personalized benefits summary
- **AI Chatbot**: Get answers to benefits questions in real-time
- **Bilingual Support**: Full English and Spanish translations

### HR Admin Portal
- **Analytics Dashboard**: Track enrollment metrics, completion rates, and trends
- **Plan Management**: Configure health plans, premiums, and benefits
- **Employee Tracking**: Monitor enrollment status across the organization
- **A/B Testing**: Run experiments to optimize the enrollment experience
- **Customization**: Company branding, enrollment periods, and experience settings

### Technical Features
- **Real-Time Collaboration**: WebSocket-powered spouse comparison
- **RxNorm Integration**: Live prescription drug database lookup
- **ElevenLabs Audio**: AI-generated voice narration in multiple languages
- **Claude AI Chatbot**: Intelligent benefits assistant with RAG
- **Multi-Tenant**: Support for multiple companies with custom branding

## 🏗 Architecture

```
touchcare-platform/
├── frontend/          # Employee-facing React SPA
├── backend/           # Express.js API server
├── admin/             # HR admin portal (React)
├── shared/            # Shared TypeScript types
├── docker-compose.yml # Full stack deployment
└── package.json       # Monorepo workspace config
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Framer Motion |
| Backend | Node.js, Express.js, TypeScript, PostgreSQL, Redis |
| AI/ML | Claude API (Anthropic), ElevenLabs TTS |
| Real-Time | Socket.io WebSockets |
| APIs | RxNorm (NIH), ElevenLabs, Anthropic |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/touchcare-platform.git
cd touchcare-platform

# Install dependencies
npm install

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start infrastructure (PostgreSQL, Redis)
npm run docker:up

# Run database migrations and seed data
npm run db:migrate
npm run db:seed

# Start all services
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Employee App | http://localhost:3000 |
| API Server | http://localhost:3001 |
| Admin Portal | http://localhost:3002 |
| API Docs | http://localhost:3001/api/docs |

### Demo Credentials

**Employee App**: No authentication required (anonymous sessions)

**Admin Portal**:
- Email: `admin@acme.com`
- Password: `admin123`

## 📁 Project Structure

### Backend (`/backend`)

```
backend/
├── src/
│   ├── config/          # Environment, database config
│   ├── middleware/      # Auth, validation, rate limiting
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   │   ├── analyticsService.ts    # A/B testing, metrics
│   │   ├── audioService.ts        # ElevenLabs integration
│   │   ├── calculationEngine.ts   # TCO calculations
│   │   ├── chatbotService.ts      # Claude AI chatbot
│   │   ├── collaborationService.ts # WebSocket collaboration
│   │   ├── pdfService.ts          # PDF generation
│   │   └── prescriptionService.ts # RxNorm integration
│   └── utils/           # Validation, logging
├── migrations/          # PostgreSQL schema
└── seeds/               # Demo data
```

### Frontend (`/frontend`)

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Route pages
│   │   ├── LandingPage.tsx
│   │   ├── ProfileBuilder.tsx
│   │   ├── Recommendations.tsx
│   │   └── Review.tsx
│   ├── services/        # API client
│   ├── store.ts         # Zustand state management
│   └── i18n.ts          # Internationalization
└── index.html
```

### Admin (`/admin`)

```
admin/
├── src/
│   ├── components/      # Layout, shared components
│   ├── pages/           # Admin pages
│   │   ├── Dashboard.tsx
│   │   ├── Plans.tsx
│   │   ├── Analytics.tsx
│   │   ├── Employees.tsx
│   │   └── Settings.tsx
│   └── services/        # API client
└── index.html
```

## 🗄 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `companies` | Multi-tenant company data with branding |
| `users` | Employee and admin accounts |
| `plans` | Health plan configurations |
| `sessions` | Anonymous/authenticated enrollment sessions |
| `prescriptions` | Drug database with RxNorm integration |
| `company_formularies` | Company-specific drug tier overrides |
| `enrollments` | Final enrollment records |
| `analytics_events` | Event tracking for analytics |
| `chat_conversations` | AI chatbot conversation history |
| `audio_cache` | ElevenLabs audio caching |

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Sessions
- `POST /api/sessions` - Create enrollment session
- `GET /api/sessions/:id` - Get session
- `PUT /api/sessions/:id` - Update session

### Plans & Recommendations
- `GET /api/plans` - List available plans
- `POST /api/recommendations` - Generate personalized recommendations

### Prescriptions
- `GET /api/prescriptions/search` - Search drugs
- `GET /api/prescriptions/:id/alternatives` - Find alternatives

### Chat
- `POST /api/chat` - Send message to AI chatbot

### Analytics
- `POST /api/analytics/events` - Track events
- `GET /api/analytics/funnel` - Get funnel metrics (admin)
- `GET /api/analytics/experiments/:id` - Get experiment results (admin)

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | 3001 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (optional) | - |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) | - |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test --workspace=backend

# Run frontend tests
npm run test --workspace=frontend
```

## 📦 Deployment

### Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

1. Build all packages:
```bash
npm run build
```

2. Run database migrations:
```bash
npm run db:migrate
```

3. Start the backend:
```bash
cd backend && npm start
```

4. Serve frontend and admin as static files

## 🔒 Security

- JWT-based authentication
- bcrypt password hashing
- Rate limiting on all endpoints
- Input validation with Zod
- CORS configuration
- SQL injection prevention (parameterized queries)

## 📈 Analytics & A/B Testing

The platform includes a built-in analytics and experimentation framework:

- **Event Tracking**: All user interactions are tracked
- **Funnel Analysis**: Visualize drop-off points
- **A/B Testing**: Run experiments with statistical significance
- **Feature Flags**: Control feature rollout

## 🌐 Internationalization

Full support for multiple languages:

- English (en) - Default
- Spanish (es) - Complete translation

Add new languages by extending `frontend/src/i18n.ts`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by TouchCare/Baobob Management.

## 🆘 Support

For support, contact the development team or open an issue in the repository.

---

Built with ❤️ by the TouchCare team
