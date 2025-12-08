# FactureX - Pre-Deployment Security Audit Report

**Date:** January 26, 2025  
**Auditor:** Security Expert  
**Application:** FactureX - Invoice Management System  
**Stack:** React + Vite + Supabase (PostgreSQL)

---

## Executive Summary

This security audit identified **4 CRITICAL** and **6 HIGH** severity vulnerabilities that must be addressed before production deployment. The application has a solid foundation with RLS policies and authentication, but several security gaps could lead to unauthorized access, data exposure, and privilege escalation.

**Risk Level:** 🔴 **HIGH** - Immediate action required before production deployment

---

## 🔴 CRITICAL Severity Issues

### 1. **CRITICAL: Hardcoded Supabase Credentials in Source Code**

**File:** `src/integrations/supabase/client.ts`

**Issue:**
```typescript
const SUPABASE_URL = "https://ddnxtuhswmewoxrwswzg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Risk:**
- Supabase URL and anon key are hardcoded and committed to version control
- Anyone with repository access can see these credentials
- If repository becomes public, credentials are exposed
- Anon key is visible in client-side bundle

**Impact:** Data breach, unauthorized database access

**Recommendation:**
- Move credentials to environment variables (`.env` file)
- Use `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`
- Add `.env` to `.gitignore`
- Rotate the anon key if repository was ever public
- Use different keys for development/staging/production

---

### 2. **CRITICAL: Insecure Admin Role Assignment**

**Files:** 
- `src/components/auth/AuthProvider.tsx` (lines 57-59)
- `src/pages/AdminSetup.tsx` (lines 58, 69-71)
- `src/pages/Login.tsx` (line 54)

**Issue:**
```typescript
// AuthProvider.tsx
const isAdmin = user?.user_metadata?.role === 'admin' || 
               user?.app_metadata?.role === 'admin' ||
               user?.user_metadata?.is_admin === true;

// AdminSetup.tsx - Anyone can create admin account
const { data, error } = await supabase.auth.signUp({
  options: {
    data: {
      role: 'admin'  // ⚠️ User-controlled
    }
  }
});

// Login.tsx - Default users get 'operateur' role
options: {
  data: {
    role: 'operateur'  // ⚠️ User-controlled
  }
}
```

**Risk:**
- `user_metadata` is **client-controlled** and can be manipulated
- Any user can modify their JWT to set `role: 'admin'`
- `/admin-setup` route is publicly accessible without authentication
- No server-side validation of admin role
- Privilege escalation vulnerability

**Impact:** Complete system compromise, unauthorized admin access

**Recommendation:**
1. **Use `app_metadata` ONLY** (server-controlled, not client-controlled)
2. **Create admin role via Supabase Dashboard or SQL:**
   ```sql
   UPDATE auth.users 
   SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
   WHERE email = 'admin@example.com';
   ```
3. **Remove `/admin-setup` route** or protect it with:
   - Environment-based flag (only available in development)
   - One-time setup token
   - Database check (if admin exists, disable route)
4. **Never trust `user_metadata` for authorization**
5. **Update RLS policies to use `app_metadata`:**
   ```sql
   auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
   ```

---

### 3. **CRITICAL: Overly Permissive RLS Policies**

**Files:** Multiple migration files

**Issue:**
```sql
-- clients table - ANY authenticated user can do ANYTHING
CREATE POLICY "clients_select_policy" ON public.clients 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients_insert_policy" ON public.clients 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "clients_update_policy" ON public.clients 
FOR UPDATE TO authenticated USING (true);

-- transactions table - Same issue
CREATE POLICY "transactions_select_policy" ON public.transactions 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions_insert_policy" ON public.transactions 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "transactions_update_policy" ON public.transactions 
FOR UPDATE TO authenticated USING (true);

-- factures table - Same issue
CREATE POLICY "Enable read access for authenticated users" ON public.factures
  FOR SELECT USING (auth.role() = 'authenticated');
```

**Risk:**
- No data isolation between users/organizations
- Any authenticated user can read ALL clients, transactions, and invoices
- Any authenticated user can modify ANY record
- No multi-tenancy support
- Violates principle of least privilege

**Impact:** Complete data breach, unauthorized data modification, compliance violations (GDPR, etc.)

**Recommendation:**
Implement proper multi-tenancy with organization-based isolation:

```sql
-- Add organization_id to tables
ALTER TABLE public.clients ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE public.transactions ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE public.factures ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Update policies to enforce organization isolation
CREATE POLICY "clients_select_policy" ON public.clients 
FOR SELECT TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "clients_insert_policy" ON public.clients 
FOR INSERT TO authenticated 
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Similar for UPDATE and DELETE
```

---

### 4. **CRITICAL: Content Security Policy Allows 'unsafe-eval' and 'unsafe-inline'**

**File:** `index.html` (lines 6-15)

**Issue:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  ...
">
```

**Risk:**
- `'unsafe-eval'` allows `eval()`, `Function()`, `setTimeout(string)` - major XSS vector
- `'unsafe-inline'` allows inline scripts - defeats CSP purpose
- Attackers can inject and execute arbitrary JavaScript
- Does not protect against XSS attacks

**Impact:** Cross-Site Scripting (XSS), session hijacking, data theft

**Recommendation:**
1. **Remove `'unsafe-eval'` and `'unsafe-inline'`**
2. **Use nonces or hashes for inline scripts:**
   ```html
   script-src 'self' 'nonce-{random}';
   ```
3. **Move all inline scripts to external files**
4. **Use Vite's CSP plugin** to generate nonces automatically
5. **Test thoroughly** - React/Vite may need specific CSP configuration

---

## 🟠 HIGH Severity Issues

### 5. **HIGH: No Rate Limiting on Authentication Endpoints**

**Files:** `src/pages/Login.tsx`, `src/pages/AdminSetup.tsx`

**Issue:**
- No rate limiting on login attempts
- No rate limiting on signup
- No CAPTCHA or bot protection
- Vulnerable to brute force attacks
- Vulnerable to credential stuffing

**Impact:** Account takeover, DDoS, resource exhaustion

**Recommendation:**
1. **Enable Supabase Auth rate limiting** in dashboard
2. **Implement client-side rate limiting** with exponential backoff
3. **Add CAPTCHA** (reCAPTCHA, hCaptcha) for login/signup
4. **Monitor failed login attempts** and implement account lockout
5. **Use Supabase Edge Functions** for custom rate limiting logic

---

### 6. **HIGH: Weak Password Requirements**

**File:** `src/pages/AdminSetup.tsx` (line 43)

**Issue:**
```typescript
if (formData.password.length < 6) {
  setError('Le mot de passe doit contenir au moins 6 caractères');
  return;
}
```

**Risk:**
- Minimum 6 characters is extremely weak
- No complexity requirements (uppercase, lowercase, numbers, symbols)
- Vulnerable to dictionary attacks
- Does not meet industry standards (NIST, OWASP)

**Impact:** Account compromise, brute force attacks

**Recommendation:**
```typescript
// Minimum 12 characters with complexity
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

if (!passwordRegex.test(formData.password)) {
  setError('Le mot de passe doit contenir au moins 12 caractères, incluant majuscules, minuscules, chiffres et symboles');
  return;
}

// Also check against common passwords
// Consider using zxcvbn library for password strength estimation
```

Also configure in Supabase Dashboard:
- Auth → Settings → Password Requirements
- Set minimum length to 12
- Enable complexity requirements

---

### 7. **HIGH: Missing CSRF Protection**

**Issue:**
- No CSRF tokens on state-changing operations
- Supabase client uses cookies for session management
- Vulnerable to Cross-Site Request Forgery

**Risk:**
- Attacker can trick authenticated users into performing unwanted actions
- Can create/modify/delete data on behalf of victim
- Can change user settings

**Impact:** Unauthorized actions, data manipulation

**Recommendation:**
1. **Use Supabase's built-in CSRF protection:**
   ```typescript
   const { data, error } = await supabase.auth.getSession();
   // Supabase handles CSRF via JWT in Authorization header
   ```
2. **Ensure all requests use Authorization header** (not cookies)
3. **Implement SameSite cookie attribute** if using cookies:
   ```typescript
   // In Supabase settings
   sameSite: 'strict'
   ```
4. **Add custom CSRF tokens** for sensitive operations

---

### 8. **HIGH: Image Proxy SSRF Vulnerability**

**File:** `supabase/functions/image-proxy/index.ts`

**Issue:**
```typescript
const imageUrl = url.searchParams.get('url');

// Validation only checks protocol
const parsedUrl = new URL(imageUrl);
if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
  return new Response('Invalid URL protocol', { ... });
}

// Fetches ANY URL without IP/domain restrictions
const response = await fetch(imageUrl, { ... });
```

**Risk:**
- Server-Side Request Forgery (SSRF)
- Attacker can scan internal network
- Can access internal services (metadata endpoints, databases, etc.)
- Can bypass firewall restrictions
- Can access localhost services

**Impact:** Internal network exposure, cloud metadata theft (AWS credentials), data breach

**Recommendation:**
```typescript
// Whitelist allowed domains
const ALLOWED_DOMAINS = [
  'ddnxtuhswmewoxrwswzg.supabase.co',
  'images.unsplash.com',
  'cdn.example.com'
];

const parsedUrl = new URL(imageUrl);

// Block private IP ranges
const hostname = parsedUrl.hostname;
if (
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.startsWith('192.168.') ||
  hostname.startsWith('10.') ||
  hostname.startsWith('172.16.') ||
  hostname === '169.254.169.254' // AWS metadata
) {
  return new Response('Access to private IPs forbidden', { status: 403 });
}

// Check domain whitelist
if (!ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain))) {
  return new Response('Domain not allowed', { status: 403 });
}
```

---

### 9. **HIGH: No Input Validation on User Inputs**

**Issue:**
- Forms accept user input without validation
- No sanitization before database insertion
- No length limits on text fields
- Vulnerable to SQL injection (mitigated by Supabase ORM, but still risky)
- Vulnerable to XSS if data is rendered

**Files:** Multiple form components

**Impact:** XSS, data corruption, DoS

**Recommendation:**
1. **Use Zod schemas** for all form validation (already installed)
2. **Implement server-side validation** in RLS policies or triggers
3. **Add length limits** to all text inputs
4. **Sanitize HTML** if rendering user content
5. **Use parameterized queries** (Supabase does this automatically)

Example:
```typescript
import { z } from 'zod';

const clientSchema = z.object({
  nom: z.string().min(1).max(100).trim(),
  telephone: z.string().regex(/^\+?[0-9]{10,15}$/),
  ville: z.string().min(1).max(100).trim(),
});
```

---

### 10. **HIGH: Insufficient Logging and Monitoring**

**Issue:**
- No security event logging (failed logins, permission changes, etc.)
- No alerting for suspicious activities
- Activity logs exist but may not capture security events
- No audit trail for sensitive operations

**Impact:** Delayed breach detection, inability to investigate incidents

**Recommendation:**
1. **Log all security-relevant events:**
   - Failed login attempts
   - Permission changes
   - Admin actions
   - Data exports
   - Account modifications
2. **Implement real-time alerting** for:
   - Multiple failed logins
   - Admin account creation
   - Bulk data operations
3. **Use Supabase Realtime** for security monitoring
4. **Integrate with SIEM** or logging service (Datadog, Sentry, etc.)
5. **Retain logs** for compliance (minimum 90 days)

---

## 🟡 MEDIUM Severity Issues

### 11. **MEDIUM: CORS Configuration Too Permissive**

**File:** `supabase/functions/image-proxy/index.ts`

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ⚠️ Allows ANY origin
  ...
};
```

**Recommendation:**
```typescript
const ALLOWED_ORIGINS = [
  'https://facturex.coccinelledrc.com',
  'http://localhost:8080'
];

const origin = req.headers.get('origin');
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
  ...
};
```

---

### 12. **MEDIUM: Missing Security Headers**

**Issue:**
- No `X-Frame-Options` (clickjacking protection)
- No `X-Content-Type-Options` (MIME sniffing protection)
- No `Referrer-Policy`
- No `Permissions-Policy`

**Recommendation:**
Add to `index.html` or configure in hosting provider:
```html
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()">
```

---

### 13. **MEDIUM: Session Management Issues**

**Issue:**
- No session timeout configuration visible
- No automatic logout on inactivity
- Sessions may persist indefinitely

**Recommendation:**
1. Configure session timeout in Supabase:
   ```typescript
   // Set JWT expiry to 1 hour
   JWT_EXPIRY=3600
   ```
2. Implement client-side inactivity detection:
   ```typescript
   useEffect(() => {
     let timeout;
     const resetTimer = () => {
       clearTimeout(timeout);
       timeout = setTimeout(() => {
         supabase.auth.signOut();
       }, 15 * 60 * 1000); // 15 minutes
     };
     
     window.addEventListener('mousemove', resetTimer);
     window.addEventListener('keypress', resetTimer);
     
     return () => {
       window.removeEventListener('mousemove', resetTimer);
       window.removeEventListener('keypress', resetTimer);
     };
   }, []);
   ```

---

### 14. **MEDIUM: No Email Verification Enforcement**

**Files:** `src/pages/Login.tsx`, `src/pages/AdminSetup.tsx`

**Issue:**
- Users can sign up but email verification is not enforced
- Users can access system without verified email

**Recommendation:**
1. Enable email verification in Supabase Dashboard
2. Check `user.email_confirmed_at` before allowing access:
   ```typescript
   if (!user.email_confirmed_at) {
     return <EmailVerificationRequired />;
   }
   ```

---

### 15. **MEDIUM: Sensitive Data in localStorage**

**Files:** `src/hooks/useRealTimeActivity.ts`, `src/services/activityLogger.ts`

**Issue:**
- Potential storage of sensitive data in localStorage
- localStorage is not encrypted
- Accessible via XSS

**Recommendation:**
1. **Never store sensitive data** in localStorage
2. **Use sessionStorage** for temporary data
3. **Encrypt sensitive data** before storage
4. **Clear storage** on logout

---

### 16. **MEDIUM: Missing Dependency Security Scanning**

**Issue:**
- No automated dependency vulnerability scanning
- Using `^` version ranges (can auto-update to vulnerable versions)

**Recommendation:**
1. **Add npm audit** to CI/CD:
   ```json
   "scripts": {
     "audit": "npm audit --audit-level=moderate"
   }
   ```
2. **Use Dependabot** or Snyk for automated scanning
3. **Pin exact versions** for production:
   ```json
   "react": "18.3.1"  // Instead of "^18.3.1"
   ```
4. **Regular security updates** schedule

---

## ✅ Security Best Practices Observed

1. ✅ **RLS Enabled** on all tables
2. ✅ **Authentication** implemented with Supabase Auth
3. ✅ **HTTPS** enforced (via Supabase)
4. ✅ **Password hashing** handled by Supabase
5. ✅ **Protected routes** implemented
6. ✅ **Activity logging** table exists
7. ✅ **CSP header** present (needs improvement)
8. ✅ **Modern React** with TypeScript

---

## Priority Remediation Roadmap

### 🔴 **Phase 1: CRITICAL (Before Deployment) - 1-2 Days**
1. Move Supabase credentials to environment variables
2. Fix admin role assignment (use app_metadata only)
3. Implement organization-based RLS policies
4. Fix CSP to remove unsafe-eval and unsafe-inline
5. Add IP/domain whitelist to image proxy

### 🟠 **Phase 2: HIGH (Week 1) - 3-5 Days**
1. Implement rate limiting on auth endpoints
2. Strengthen password requirements
3. Add CSRF protection verification
4. Implement comprehensive input validation
5. Set up security logging and monitoring

### 🟡 **Phase 3: MEDIUM (Week 2-3) - 5-7 Days**
1. Fix CORS configuration
2. Add missing security headers
3. Implement session timeout
4. Enforce email verification
5. Set up dependency scanning
6. Security training for development team

---

## Testing Recommendations

1. **Penetration Testing**
   - Hire external security firm
   - Test authentication/authorization
   - Test RLS policies
   - Test for SSRF, XSS, CSRF

2. **Automated Security Scanning**
   - OWASP ZAP
   - Burp Suite
   - npm audit
   - Snyk

3. **Code Review**
   - Security-focused code review
   - Review all RLS policies
   - Review authentication logic

---

## Compliance Considerations

If handling EU data (GDPR):
- ✅ Data encryption in transit (Supabase)
- ⚠️ Need data isolation per organization
- ⚠️ Need audit logs for data access
- ⚠️ Need data retention policies
- ⚠️ Need right to deletion implementation

---

## Conclusion

FactureX has a solid architectural foundation but requires immediate security hardening before production deployment. The **4 CRITICAL** issues pose significant risks and must be resolved immediately. The **6 HIGH** severity issues should be addressed within the first week of deployment.

**Recommendation:** **DO NOT DEPLOY** to production until at least all CRITICAL and HIGH severity issues are resolved.

---

## Next Steps

1. Review this report with the development team
2. Create tickets for each vulnerability
3. Implement fixes following the priority roadmap
4. Conduct security testing after fixes
5. Schedule regular security audits (quarterly)

---

**Report Generated:** January 26, 2025  
**Contact:** Security Team  
**Classification:** CONFIDENTIAL
