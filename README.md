# 🧠 Perin - AI-Powered Digital Delegate

> A Next.js application featuring an intelligent AI assistant with Gmail integration, persistent memory, and multi-agent coordination capabilities.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd perin

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)

## 🎯 Overview

Perin is an AI-powered digital delegate that helps users manage emails, schedule meetings, and coordinate tasks. Built with Next.js, OpenAI GPT-4, and PostgreSQL, it features:

- **Intelligent AI Assistant**: Context-aware conversations with persistent memory
- **Gmail Integration**: OAuth2 authentication with smart email context loading
- **LangGraph Workflow**: Multi-step reasoning and tool integration
- **Service Layer Architecture**: Clean separation between UI and API layers
- **Type Safety**: Full TypeScript coverage with NextAuth integration

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                │
├─────────────────────────────────────────────────────────────┤
│  Components: PerinChat, Dashboard, Onboarding             │
│  Service Layer: users.ts, integrations.ts, ai.ts          │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  Routes: /api/ai/chat, /api/integrations/gmail/*, /api/integrations/calendar/* │
│  Authentication: NextAuth.js with PostgreSQL              │
├─────────────────────────────────────────────────────────────┤
│                  Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  LangGraph Workflow: Memory → Gmail → Calendar → OpenAI → Response │
│  Smart Queries: Direct database execution with type safety │
├─────────────────────────────────────────────────────────────┤
│                  Database Layer (PostgreSQL)               │
├─────────────────────────────────────────────────────────────┤
│  Tables: users, user_integrations, memory (JSONB)         │
│  Features: Connection pooling, JSONB for flexible data    │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

### 🤖 AI Assistant

- **Real-time Streaming**: Character-by-character response streaming
- **Persistent Memory**: Context-aware conversations across sessions
- **Dynamic Prompts**: Personalized system prompts based on user preferences
- **Intent Classification**: Smart routing for different types of requests

### 📧 Gmail Integration

- **OAuth2 Authentication**: Secure Gmail API access
- **Smart Context Loading**: Only loads emails when conversationally relevant
- **Email Analysis**: Summarize, categorize, and respond to emails
- **Token Management**: Automatic refresh and secure storage

### 📅 Calendar Integration

- **OAuth2 Authentication**: Secure Google Calendar API access
- **Smart Context Loading**: Only loads calendar data when conversationally relevant
- **Event Management**: Read events, create appointments, and check availability
- **Token Management**: Automatic refresh and secure storage

### 🧠 LangGraph Workflow

- **Multi-Step Reasoning**: Complex task decomposition
- **Tool Integration**: Seamless integration with external services
- **State Management**: Centralized workflow state
- **Future-Ready**: Foundation for multi-agent coordination

### 🛡️ Security & Performance

- **Type Safety**: Full TypeScript coverage
- **Authentication**: NextAuth.js with JWT tokens
- **Database Security**: Parameterized queries, connection pooling
- **Error Handling**: Graceful error recovery and logging

## 📚 Documentation

### Core Documentation

- **[AI Integration](./AI_INTEGRATION_README.md)** - OpenAI integration, memory management, and streaming
- **[Gmail Integration](./GMAIL_INTEGRATION_README.md)** - OAuth2 flow, email context, and API endpoints
- **[Calendar Integration](./CALENDAR_INTEGRATION_README.md)** - OAuth2 flow, calendar management, and API endpoints
- **[LangGraph Integration](./LANGGRAPH_INTEGRATION_README.md)** - Workflow orchestration and multi-step reasoning
- **[Authentication](./AUTH_README.md)** - NextAuth.js setup, user management, and security

### Development Documentation

- **[Service Layer](./SERVICE_LAYER_README.md)** - API abstraction and client-side data fetching
- **[Type System](./TYPES_README.md)** - TypeScript organization and NextAuth integration
- **[UI Components](./src/components/ui/README.md)** - Reusable React components with animations

### Quick Reference

- **[Project Conventions](./README.md#project-conventions)** - Coding standards and file structure
- **[API Reference](./AI_INTEGRATION_README.md#api-endpoints)** - Complete API endpoint documentation
- **[Environment Setup](./AUTH_README.md#environment-configuration)** - Required environment variables

## 🛠️ Tech Stack

### Frontend

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **NextAuth.js** - Authentication and session management

### Backend

- **OpenAI GPT-4** - AI language model
- **LangGraph** - Multi-step reasoning workflows
- **PostgreSQL** - Primary database with JSONB support
- **pg** - Database client with connection pooling

### Integrations

- **Gmail API** - Email management and context
- **Google Calendar API** - Calendar management and scheduling
- **Google OAuth2** - Secure authentication
- **Vercel** - Deployment and hosting

### Development Tools

- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Git** - Version control

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Google Cloud Console project (for Gmail and Calendar integration)

### Environment Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd perin
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Required variables:

   ```bash
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/perin

   # OpenAI
   OPENAI_API_KEY=sk-your-openai-api-key

   # NextAuth
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000

   # Gmail Integration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
   
   # Calendar Integration
   GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/integrations/calendar/callback
   ```

4. **Set up the database**

   ```bash
   # Create database tables (see AUTH_README.md for schema)
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Visit the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Register a new account
   - Start chatting with Perin!

## 🏗️ Project Conventions

### File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Protected dashboard
│   ├── onboarding/        # User onboarding flow
│   └── services/          # Service layer (API abstraction)
├── components/            # Reusable React components
│   ├── ui/               # UI components with animations
│   └── providers/        # Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Business logic and utilities
│   ├── ai/              # AI integration and LangGraph
│   ├── integrations/    # Third-party integrations
│   ├── queries/         # Database smart queries
│   └── utils/           # Helper functions
└── types/               # TypeScript type definitions
```

### Coding Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Smart Queries**: Direct database execution with type safety
- **Service Layer**: No direct API calls in components
- **Error Handling**: Consistent error responses and logging
- **Authentication**: NextAuth.js with proper session management

### API Patterns

- **RESTful Design**: Standard HTTP methods and status codes
- **Type Safety**: Full TypeScript coverage for requests/responses
- **Error Handling**: Consistent error response format
- **Streaming**: Real-time responses where appropriate

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

### Database Operations

```bash
# Smart queries are used throughout the application
# See lib/queries/ for available functions
```

### Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Set up reverse proxy (nginx/Apache) if needed

### Environment Variables for Production

```bash
# Update URLs for production domain
NEXTAUTH_URL=https://your-domain.com
GOOGLE_REDIRECT_URI=https://your-domain.com/api/integrations/gmail/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.com/api/integrations/calendar/callback
NEXT_PUBLIC_API_URL=https://your-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the established coding conventions
- Add tests for new features
- Update documentation as needed
- Ensure TypeScript compilation passes
- Test the application thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the specialized README files above
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

## 🔄 Version History

- **v1.0.0**: Initial release with basic AI chat
- **v1.1.0**: Added memory management and persistence
- **v1.2.0**: Implemented Gmail integration
- **v1.3.0**: Added LangGraph workflow orchestration
- **v1.4.0**: Implemented service layer architecture
- **v1.5.0**: Enhanced documentation and type safety
- **v1.6.0**: Fixed calendar integration OAuth2 flow and onboarding integration

---

**Built with ❤️ by the Perin Development Team**
