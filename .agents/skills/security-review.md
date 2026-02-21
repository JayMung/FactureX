# Security Review

Ensures all code follows security best practices and identifies potential vulnerabilities. Activate proactively when touching auth, user input, secrets, API endpoints, or payment/sensitive features.

## When to Apply

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints or Edge Functions
- Working with secrets or credentials
- Implementing payment features
- Storing or transmitting sensitive data
- Integrating third-party APIs

## 1. Secrets Management

**NEVER** hardcode API keys, tokens, or passwords. Always use environment variables.

```typescript
// ❌ NEVER
const apiKey = "sk-proj-xxxxx"

// ✅ ALWAYS
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
```

Checklist:
- [ ] No hardcoded secrets in source code
- [ ] All secrets in environment variables
- [ ] `.env.local` in .gitignore
- [ ] No secrets in git history
- [ ] Production secrets in hosting platform

## 2. Input Validation

Always validate with Zod schemas before processing:

```typescript
import { z } from 'zod'
const Schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})
const validated = Schema.parse(input)
```

Checklist:
- [ ] All user inputs validated with schemas
- [ ] File uploads restricted (size, type, extension)
- [ ] No direct use of user input in queries
- [ ] Whitelist validation (not blacklist)
- [ ] Error messages don't leak sensitive info

## 3. SQL Injection Prevention

**NEVER** concatenate SQL. Always use parameterized queries or Supabase client.

```typescript
// ❌ DANGEROUS
const query = `SELECT * FROM users WHERE email = '${userEmail}'`

// ✅ SAFE — Supabase client
const { data } = await supabase.from('users').select('*').eq('email', userEmail)

// ✅ SAFE — parameterized
await db.query('SELECT * FROM users WHERE email = $1', [userEmail])
```

## 4. Authentication & Authorization

- Tokens in httpOnly cookies (not localStorage)
- Authorization checks before sensitive operations
- Row Level Security enabled in Supabase
- Role-based access control implemented
- Session management secure

## 5. XSS Prevention

- Sanitize user-provided HTML with DOMPurify
- CSP headers configured
- No unvalidated dynamic content rendering
- React's built-in XSS protection used

## 6. Rate Limiting

- Rate limiting on all API endpoints
- Stricter limits on auth endpoints and expensive operations
- IP-based and user-based rate limiting

## 7. Sensitive Data Exposure

```typescript
// ❌ WRONG — logging sensitive data
console.log('User login:', { email, password })

// ✅ CORRECT — redact sensitive data
console.log('User login:', { email, userId })
```

- No passwords, tokens, or secrets in logs
- Error messages generic for users, detailed only in server logs
- No stack traces exposed to users

## 8. Dependency Security

- Run `npm audit` regularly
- Always commit lock files
- Keep dependencies up to date
- Enable Dependabot on GitHub

## Pre-Deployment Checklist

- [ ] **Secrets**: No hardcoded secrets, all in env vars
- [ ] **Input Validation**: All user inputs validated
- [ ] **SQL Injection**: All queries parameterized
- [ ] **XSS**: User content sanitized
- [ ] **Authentication**: Proper token handling
- [ ] **Authorization**: Role checks in place
- [ ] **Rate Limiting**: Enabled on all endpoints
- [ ] **HTTPS**: Enforced in production
- [ ] **Security Headers**: CSP, X-Frame-Options configured
- [ ] **Error Handling**: No sensitive data in errors
- [ ] **Row Level Security**: Enabled in Supabase
- [ ] **CORS**: Properly configured
