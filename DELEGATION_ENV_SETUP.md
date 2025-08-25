# Delegation Feature Environment Setup

## Required Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
# Delegation Security
DELEGATION_SECRET=your-secure-random-secret-here
```

## Security Notes

- The `DELEGATION_SECRET` is used to generate HMAC signatures for delegation links
- Use a strong, random secret (at least 32 characters)
- Never commit this secret to version control
- In production, use a secure secret management system

## Example Secret Generation

You can generate a secure secret using:

```bash
# Using openssl
openssl rand -hex 32

# Using node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Default Behavior

If `DELEGATION_SECRET` is not set, the system will use a default secret with a warning. This is not recommended for production use.
