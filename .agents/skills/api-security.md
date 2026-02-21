# API Security Best Practices

Implement secure API design patterns including authentication, authorization, input validation, rate limiting, and protection against common API vulnerabilities.

## When to Apply

- Designing new API endpoints or Edge Functions
- Securing existing APIs or Supabase RPC functions
- Implementing authentication and authorization (RBAC, RLS)
- Protecting against API attacks (injection, DDoS, etc.)
- Conducting API security reviews
- Implementing rate limiting and throttling
- Handling sensitive financial data in APIs

## Authentication & Authorization

- Choose authentication method (JWT, OAuth 2.0, API keys)
- Implement token-based authentication with short-lived tokens
- Set up role-based access control (RBAC)
- Secure session management
- Use strong JWT secrets (256-bit minimum)
- Set short expiration times (1 hour for access tokens)
- Implement refresh tokens stored in database (can be revoked)
- Validate token issuer and audience
- Don't store sensitive data in JWT payload

## Input Validation & Sanitization

- Validate all input data with schemas (Zod recommended)
- Sanitize user inputs
- Use parameterized queries (never string concatenation for SQL)
- Implement request schema validation
- Prevent SQL injection, XSS, and command injection
- Use allowlists, not blocklists

## Rate Limiting & Throttling

- Implement rate limiting per user/IP
- Strict limits for auth endpoints (5 attempts / 15 minutes)
- Configure request quotas for expensive operations
- Handle rate limit errors gracefully with proper headers
- Monitor for suspicious activity

## Data Protection

- Encrypt data in transit (HTTPS/TLS)
- Encrypt sensitive data at rest
- Implement proper error handling (no data leaks)
- Sanitize error messages — never expose stack traces
- Use security headers (CSP, X-Frame-Options, HSTS)
- Implement proper CORS configuration

## OWASP API Security Top 10

1. Broken Object Level Authorization — Always verify user can access resource
2. Broken Authentication — Implement strong authentication mechanisms
3. Broken Object Property Level Authorization — Validate which properties user can access
4. Unrestricted Resource Consumption — Implement rate limiting and quotas
5. Broken Function Level Authorization — Verify user role for each function
6. Unrestricted Access to Sensitive Business Flows — Protect critical workflows
7. Server Side Request Forgery (SSRF) — Validate and sanitize URLs
8. Security Misconfiguration — Use security best practices and headers
9. Improper Inventory Management — Document and secure all API endpoints
10. Unsafe Consumption of APIs — Validate data from third-party APIs

## Do NOT

- Store passwords in plain text
- Use weak secrets
- Trust user input
- Expose stack traces in production
- Use string concatenation for SQL
- Store sensitive data in JWT
- Disable CORS completely
- Log sensitive data (passwords, tokens, card numbers)
