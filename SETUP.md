# Perin Authentication Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/perin

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# App Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Generating NEXTAUTH_SECRET

You can generate a secure secret using:

```bash
openssl rand -base64 32
```

Or use a secure random string generator.

## Database Setup

1. **Create the users table** (you've already done this):

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMP,
  hashed_password TEXT,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  perin_name TEXT DEFAULT 'Perin',
  tone TEXT,
  avatar_url TEXT,
  preferred_hours JSONB,
  timezone TEXT DEFAULT 'UTC',
  memory JSONB DEFAULT '{}',

  is_beta_user BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user'
);
```

2. **Add indexes for better performance**:

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

## Features Implemented

### 🔐 Authentication System

- **NextAuth.js** integration with credentials provider
- **Password hashing** with bcryptjs (12 salt rounds)
- **JWT sessions** for secure authentication
- **Type-safe** authentication with custom session types

### 🛡️ Security Features

- **Password validation** (minimum 8 chars, uppercase, lowercase, number)
- **Email validation** with regex
- **Protected routes** with middleware
- **CSRF protection** via NextAuth
- **Secure password hashing** with bcrypt

### 📱 User Interface

- **Sign In page** (`/auth/signin`)
- **Sign Up page** (`/auth/signup`)
- **Dashboard** (`/dashboard`) - protected route
- **Responsive design** with Tailwind CSS

### 🔧 API Endpoints

- `POST /api/auth/register` - User registration
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints
- `GET /api/health` - Health check
- Protected API routes with middleware

### 🎯 User Management

- **Custom user fields** for Perin-specific data
- **Role-based access** (user, admin, etc.)
- **Beta user flag** for feature testing
- **User preferences** (timezone, preferred hours, etc.)

## Usage

### 1. Start the development server

```bash
npm run dev
```

### 2. Test the authentication flow

1. Visit `http://localhost:3000`
2. Click "Sign Up" to create an account
3. Fill in the registration form
4. Sign in with your credentials
5. Access the dashboard

### 3. API Testing

- **Health check**: `GET http://localhost:3000/api/health`
- **Register user**: `POST http://localhost:3000/api/auth/register`
- **Sign in**: Use the NextAuth endpoints

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/route.ts    # NextAuth endpoints
│   │       └── register/route.ts         # Registration endpoint
│   ├── auth/
│   │   ├── signin/page.tsx               # Sign in page
│   │   └── signup/page.tsx               # Sign up page
│   ├── dashboard/page.tsx                # Protected dashboard
│   └── page.tsx                          # Home page
├── components/
│   └── providers/
│       └── SessionProvider.tsx           # NextAuth provider
├── hooks/
│   └── useAuth.ts                        # Authentication hook
├── lib/
│   ├── auth.ts                           # NextAuth configuration
│   ├── db.ts                             # Database connection
│   ├── db-types.ts                       # TypeScript types
│   ├── queries/
│   │   └── users.ts                      # User queries
│   └── utils/
│       ├── auth-helpers.ts               # Auth utilities
│       ├── db-helpers.ts                 # Database utilities
│       └── error-handlers.ts             # Error handling
├── types/
│   └── next-auth.d.ts                    # NextAuth type extensions
└── middleware.ts                         # Route protection
```

## Next Steps

1. **Add OAuth providers** (Google, GitHub, etc.)
2. **Implement email verification**
3. **Add password reset functionality**
4. **Create user profile management**
5. **Add role-based access control**
6. **Implement session management**
7. **Add audit logging**

## Troubleshooting

### Common Issues

1. **Database connection failed**

   - Check your `DATABASE_URL` environment variable
   - Ensure PostgreSQL is running
   - Verify database permissions

2. **NextAuth secret not set**

   - Set `NEXTAUTH_SECRET` in your environment variables
   - Use a secure random string

3. **Authentication not working**

   - Check browser console for errors
   - Verify NextAuth configuration
   - Ensure database queries are working

4. **TypeScript errors**
   - Run `npm run build` to check for type errors
   - Ensure all type definitions are correct

### Debug Mode

To enable NextAuth debug mode, add to your `.env.local`:

```bash
NEXTAUTH_DEBUG=true
```

This will provide detailed logging for authentication issues.
