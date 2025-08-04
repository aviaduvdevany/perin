# 📚 Perin Documentation Hub

> Complete documentation index for the Perin AI-powered digital delegate project.

## 🚀 Quick Navigation

### 🎯 **Getting Started**

- **[Main README](./README.md)** - Project overview, quick start, and architecture
- **[Environment Setup](./AUTH_README.md#environment-configuration)** - Required environment variables
- **[Project Conventions](./README.md#project-conventions)** - Coding standards and file structure

### 🧠 **Core Features**

- **[AI Integration](./AI_INTEGRATION_README.md)** - OpenAI, LangGraph, memory management, and streaming
- **[Gmail Integration](./GMAIL_INTEGRATION_README.md)** - OAuth2, email context, and smart loading
- **[Authentication](./AUTH_README.md)** - NextAuth.js, user management, and security
- **[LangGraph Workflow](./LANGGRAPH_INTEGRATION_README.md)** - Multi-step reasoning and workflow orchestration

### 🛠️ **Development**

- **[Service Layer](./SERVICE_LAYER_README.md)** - API abstraction and client-side data fetching
- **[Type System](./TYPES_README.md)** - TypeScript organization and NextAuth integration
- **[UI Components](./src/components/ui/README.md)** - Reusable React components with animations

## 📋 Documentation Structure

```
📚 Documentation Hub
├── 🎯 Getting Started
│   ├── README.md                    # Main project overview
│   ├── Environment Setup            # Required variables
│   └── Project Conventions          # Coding standards
│
├── 🧠 Core Features
│   ├── AI_INTEGRATION_README.md     # OpenAI + LangGraph + Memory
│   ├── GMAIL_INTEGRATION_README.md  # Gmail OAuth2 + Email Context
│   ├── AUTH_README.md              # NextAuth.js + User Management
│   └── LANGGRAPH_INTEGRATION_README.md # Workflow Orchestration
│
├── 🛠️ Development
│   ├── SERVICE_LAYER_README.md     # API Abstraction
│   ├── TYPES_README.md             # TypeScript Organization
│   └── UI Components               # React Components
│
└── 📁 Source Code
    ├── src/app/services/           # Service layer implementation
    ├── src/lib/ai/langgraph/       # LangGraph workflow
    ├── src/lib/integrations/gmail/ # Gmail integration
    └── src/types/                  # TypeScript definitions
```

## 🎯 **What You're Looking For**

### **New to the Project?**

Start with the **[Main README](./README.md)** for:

- Project overview and features
- Quick start guide
- Architecture explanation
- Tech stack details

### **Setting Up Development Environment?**

Follow these steps:

1. **[Environment Setup](./AUTH_README.md#environment-configuration)** - Required variables
2. **[Project Conventions](./README.md#project-conventions)** - Coding standards
3. **[Getting Started](./README.md#getting-started)** - Installation and setup

### **Working on AI Features?**

Check out:

- **[AI Integration](./AI_INTEGRATION_README.md)** - Complete AI system guide
- **[LangGraph Workflow](./LANGGRAPH_INTEGRATION_README.md)** - Multi-step reasoning
- **[Memory Management](./AI_INTEGRATION_README.md#memory-management)** - Persistent context

### **Implementing Gmail Integration?**

Reference:

- **[Gmail Integration](./GMAIL_INTEGRATION_README.md)** - Complete OAuth2 guide
- **[Smart Context Loading](./GMAIL_INTEGRATION_README.md#smart-context-loading)** - Email detection
- **[Service Layer](./SERVICE_LAYER_README.md)** - API abstraction patterns

### **Building Frontend Components?**

Use:

- **[UI Components](./src/components/ui/README.md)** - Reusable components
- **[Service Layer](./SERVICE_LAYER_README.md)** - API integration patterns
- **[Type System](./TYPES_README.md)** - TypeScript organization

### **Debugging Issues?**

Troubleshooting guides:

- **[AI Troubleshooting](./AI_INTEGRATION_README.md#troubleshooting)**
- **[Gmail Troubleshooting](./GMAIL_INTEGRATION_README.md#troubleshooting)**
- **[Auth Troubleshooting](./AUTH_README.md#troubleshooting)**

## 🔍 **Quick Reference**

### **API Endpoints**

- **Chat**: `POST /api/ai/chat` - Main AI interaction with streaming
- **Memory**: `GET/POST/DELETE /api/ai/memory` - Memory management
- **Gmail Connect**: `POST /api/integrations/gmail/connect` - OAuth initiation
- **Gmail Callback**: `GET /api/integrations/gmail/callback` - OAuth callback
- **Gmail Emails**: `GET /api/integrations/gmail/emails` - Email fetching

### **Key Files**

- **Main Entry**: `src/lib/ai/langgraph/index.ts` - LangGraph workflow
- **Gmail Node**: `src/lib/ai/langgraph/nodes/gmail-node.ts` - Email context
- **Service Layer**: `src/app/services/internalApi.ts` - API abstraction
- **Type Definitions**: `src/types/ai.ts` - AI-related types

### **Environment Variables**

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key
DATABASE_URL=postgresql://username:password@localhost:5432/perin
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Gmail Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
```

## 🚀 **Common Tasks**

### **Adding a New Integration**

1. Create API routes in `src/app/api/integrations/[service]/`
2. Add service functions in `src/app/services/integrations.ts`
3. Create LangGraph node in `src/lib/ai/langgraph/nodes/[service]-node.ts`
4. Update types in `src/types/ai.ts`
5. Add database schema for `user_integrations` table

### **Creating a New API Endpoint**

1. Create route file in `src/app/api/[domain]/[endpoint]/route.ts`
2. Use smart queries from `src/lib/queries/[domain].ts`
3. Add service function in `src/app/services/[domain].ts`
4. Update types in `src/types/api.ts`

### **Adding a New UI Component**

1. Create component in `src/components/ui/[ComponentName].tsx`
2. Add to `src/components/ui/README.md`
3. Use service layer for API calls
4. Follow TypeScript patterns from `src/types/`

## 📚 **Additional Resources**

### **External Documentation**

- [Next.js App Router](https://nextjs.org/docs/app)
- [OpenAI API](https://platform.openai.com/docs)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [NextAuth.js](https://next-auth.js.org/)
- [Gmail API](https://developers.google.com/gmail/api)
- [PostgreSQL](https://www.postgresql.org/docs/)

### **Project Resources**

- **GitHub Repository**: [Link to repository]
- **Live Demo**: [Link to demo]
- **Issue Tracker**: [Link to issues]
- **Discussions**: [Link to discussions]

## 🔄 **Documentation Updates**

### **Version History**

- **v1.8.0**: Enhanced documentation organization and examples
- **v1.7.0**: Implemented service layer architecture
- **v1.6.0**: Added Gmail integration with LangGraph workflow
- **v1.5.0**: Complete NextAuth integration
- **v1.4.0**: Enhanced streaming and error handling
- **v1.3.0**: Added comprehensive type safety
- **v1.2.0**: Implemented intent classification
- **v1.1.0**: Added memory management system
- **v1.0.0**: Initial AI integration with basic chat

### **Contributing to Documentation**

1. Update relevant README files when adding features
2. Follow the established documentation structure
3. Include code examples and usage patterns
4. Update this documentation hub for new sections
5. Test all code examples before committing

---

**Need help?** Check the troubleshooting sections in each README or create an issue in the repository.

**Built with ❤️ by the Perin Development Team**
