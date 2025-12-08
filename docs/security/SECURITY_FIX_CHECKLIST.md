# FactureX Security Fix Checklist

This checklist provides actionable steps to fix all identified security vulnerabilities.

## 📊 Progression Globale

**Date de dernière mise à jour:** 26 janvier 2025, 00:45

### Vulnérabilités CRITIQUES (4 total)
- ✅ **Task 1:** Credentials en variables d'environnement - **COMPLÉTÉ**
- ✅ **Task 2:** Admin role sécurisé (app_metadata) - **COMPLÉTÉ**
- ✅ **Task 3:** RLS policies avec isolation par organisation - **COMPLÉTÉ**
- ⏳ **Task 4:** Content Security Policy (CSP) - **EN ATTENTE**

**Progression:** 3/4 (75%) ✅

### Vulnérabilités HIGH (6 total)
- ⏳ Task 5: Rate limiting - EN ATTENTE
- ⏳ Task 6: Password requirements - EN ATTENTE
- ⏳ Task 7: CSRF protection - EN ATTENTE
- ⏳ Task 8: Image proxy SSRF - EN ATTENTE
- ⏳ Task 9: Input validation - EN ATTENTE
- ⏳ Task 10: Security logging - EN ATTENTE

**Progression:** 0/6 (0%)

### Actions Restantes Immédiates
1. ⚠️ Configurer variables d'environnement sur Vercel/VPS
2. ⏳ Corriger CSP (Task 4)
3. ⏳ Implémenter Tasks 5-10 (HIGH priority)

---

## 🔴 CRITICAL FIXES (Must Complete Before Deployment)

### ✅ Task 1: Move Supabase Credentials to Environment Variables - **COMPLÉTÉ** ✅

**Files to modify:**
- [x] Create `.env` file in project root
- [x] Update `src/integrations/supabase/client.ts`
- [x] Update `.gitignore`
- [ ] Update deployment configuration (Vercel/VPS)

**Steps:**

1. Create `.env` file:
```env
VITE_SUPABASE_URL=https://ddnxtuhswmewoxrwswzg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Update `src/integrations/supabase/client.ts`:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}
```

3. Add to `.gitignore`:
```
.env
.env.local
.env.production
```

4. Create `.env.example`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

5. Update deployment platform (Vercel/Netlify) with environment variables

**Estimated Time:** 30 minutes

---

### ✅ Task 2: Fix Admin Role Assignment (Use app_metadata) - **COMPLÉTÉ** ✅

**Files to modify:**
- [x] `src/components/auth/AuthProvider.tsx`
- [x] `src/App.tsx` (route /admin-setup désactivée en prod)
- [x] `src/pages/Login.tsx`
- [x] All RLS policies in migrations
- [x] Admin user created: mungedijeancy@gmail.com

**Steps:**

1. Update `src/components/auth/AuthProvider.tsx`:
```typescript
// ONLY use app_metadata (server-controlled)
const isAdmin = user?.app_metadata?.role === 'admin';
```

2. Remove or protect `/admin-setup` route in `src/App.tsx`:
```typescript
// Option 1: Remove completely
// <Route path="/admin-setup" element={<AdminSetup />} />

// Option 2: Protect with environment flag
{import.meta.env.DEV && (
  <Route path="/admin-setup" element={<AdminSetup />} />
)}
```

3. Create admin via Supabase SQL Editor:
```sql
-- Set admin role via app_metadata
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-admin@email.com';
```

4. Update all RLS policies to use app_metadata:
```sql
-- Example for profiles table
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT TO authenticated 
USING (
  auth.uid() = id OR 
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
```

5. Remove user_metadata role assignment from signup:
```typescript
// Remove from Login.tsx and AdminSetup.tsx
// Do NOT include role in user_metadata
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      first_name: firstName,
      last_name: lastName,
      // role: 'operateur' ❌ REMOVE THIS
    }
  }
});
```

**Estimated Time:** 2-3 hours

---

### ✅ Task 3: Implement Organization-Based RLS Policies - **COMPLÉTÉ** ✅

**Files to create/modify:**
- [x] New migration file for organizations table
- [x] Update all table migrations (clients, transactions, factures, settings)
- [x] Update all RLS policies
- [x] Created helper function `get_user_organization_id()`
- [x] Created trigger for new users
- [x] Applied via Supabase MCP

**Steps:**

1. Create organizations table:
```sql
-- supabase/migrations/new_organizations_table.sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select_policy" ON public.organizations 
FOR SELECT TO authenticated 
USING (
  id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);
```

2. Add organization_id to profiles:
```sql
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Create default organization for existing users
INSERT INTO public.organizations (name) VALUES ('Default Organization');

UPDATE public.profiles 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.profiles 
ALTER COLUMN organization_id SET NOT NULL;
```

3. Add organization_id to all data tables:
```sql
-- For clients
ALTER TABLE public.clients 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- For transactions
ALTER TABLE public.transactions 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- For factures
ALTER TABLE public.factures 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
```

4. Update RLS policies for data isolation:
```sql
-- Example for clients table
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

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

CREATE POLICY "clients_update_policy" ON public.clients 
FOR UPDATE TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "clients_delete_policy" ON public.clients 
FOR DELETE TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ) AND
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
```

5. Update application code to include organization_id:
```typescript
// When creating new records
const { data, error } = await supabase
  .from('clients')
  .insert({
    nom: clientData.nom,
    telephone: clientData.telephone,
    ville: clientData.ville,
    organization_id: user.organization_id, // Add this
  });
```

**Estimated Time:** 4-6 hours

---

### ✅ Task 4: Fix Content Security Policy

**Files to modify:**
- [ ] `index.html`
- [ ] `vite.config.ts`

**Steps:**

1. Update `index.html` CSP:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data: blob: https://ddnxtuhswmewoxrwswzg.supabase.co;
  font-src 'self' data:;
  connect-src 'self' https://ddnxtuhswmewoxrwswzg.supabase.co wss://ddnxtuhswmewoxrwswzg.supabase.co;
  worker-src 'self' blob:;
  frame-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

2. If React requires inline scripts, use nonces with vite-plugin-csp:
```bash
npm install --save-dev vite-plugin-csp
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import csp from 'vite-plugin-csp';

export default defineConfig({
  plugins: [
    react(),
    csp({
      policy: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        // ... rest of policy
      }
    })
  ]
});
```

3. Test thoroughly after changes - some libraries may break

**Estimated Time:** 2-3 hours (including testing)

---

### ✅ Task 5: Fix Image Proxy SSRF Vulnerability

**Files to modify:**
- [ ] `supabase/functions/image-proxy/index.ts`

**Steps:**

1. Update image proxy with security checks:
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ALLOWED_DOMAINS = [
  'ddnxtuhswmewoxrwswzg.supabase.co',
  'images.unsplash.com',
  // Add other trusted domains
];

const BLOCKED_IPS = [
  '127.0.0.1',
  'localhost',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
];

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://facturex.coccinelledrc.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=86400',
};

function isPrivateIP(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('172.17.') ||
    hostname.startsWith('172.18.') ||
    hostname.startsWith('172.19.') ||
    hostname.startsWith('172.20.') ||
    hostname.startsWith('172.21.') ||
    hostname.startsWith('172.22.') ||
    hostname.startsWith('172.23.') ||
    hostname.startsWith('172.24.') ||
    hostname.startsWith('172.25.') ||
    hostname.startsWith('172.26.') ||
    hostname.startsWith('172.27.') ||
    hostname.startsWith('172.28.') ||
    hostname.startsWith('172.29.') ||
    hostname.startsWith('172.30.') ||
    hostname.startsWith('172.31.') ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('fc00:') ||
    hostname.startsWith('fe80:')
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      return new Response('Missing URL parameter', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Parse and validate URL
    const parsedUrl = new URL(imageUrl);
    
    // Check protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response('Invalid URL protocol', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Check for private IPs
    if (isPrivateIP(parsedUrl.hostname)) {
      return new Response('Access to private IPs forbidden', { 
        status: 403,
        headers: corsHeaders
      });
    }

    // Check domain whitelist
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return new Response('Domain not allowed', { 
        status: 403,
        headers: corsHeaders
      });
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FactureX-ImageProxy/1.0',
        'Accept': 'image/*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(`Failed to fetch image: ${response.statusText}`, { 
        status: response.status,
        headers: corsHeaders
      });
    }

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return new Response('Invalid content type', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Limit file size (5MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return new Response('Image too large', { 
        status: 413,
        headers: corsHeaders
      });
    }

    const imageData = await response.arrayBuffer();

    return new Response(imageData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': imageData.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders
    });
  }
});
```

**Estimated Time:** 1-2 hours

---

## 🟠 HIGH PRIORITY FIXES (Week 1)

### ✅ Task 6: Implement Rate Limiting

**Steps:**

1. Enable Supabase rate limiting in dashboard:
   - Go to Authentication → Rate Limits
   - Set login attempts: 5 per hour per IP
   - Set signup attempts: 3 per hour per IP

2. Add client-side rate limiting:
```typescript
// src/utils/rateLimiter.ts
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  canAttempt(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }
}

// Usage in Login.tsx
const rateLimiter = new RateLimiter();

const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!rateLimiter.canAttempt('login', 5, 60000)) {
    setError('Too many login attempts. Please try again later.');
    return;
  }
  
  // ... rest of login logic
};
```

**Estimated Time:** 2-3 hours

---

### ✅ Task 7: Strengthen Password Requirements

**Files to modify:**
- [ ] `src/pages/AdminSetup.tsx`
- [ ] `src/pages/Login.tsx`
- [ ] Create `src/utils/passwordValidator.ts`

**Steps:**

1. Create password validator:
```typescript
// src/utils/passwordValidator.ts
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Le mot de passe doit contenir au moins 12 caractères');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)');
  }
  
  // Check against common passwords
  const commonPasswords = ['password123', 'admin123', '12345678'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Ce mot de passe est trop commun');
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 16) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}
```

2. Update forms to use validator

3. Configure in Supabase Dashboard:
   - Auth → Settings → Password Requirements
   - Minimum length: 12
   - Require uppercase: Yes
   - Require lowercase: Yes
   - Require numbers: Yes
   - Require special characters: Yes

**Estimated Time:** 1-2 hours

---

### ✅ Task 8: Add Input Validation with Zod

**Files to create:**
- [ ] `src/schemas/clientSchema.ts`
- [ ] `src/schemas/transactionSchema.ts`
- [ ] `src/schemas/factureSchema.ts`

**Steps:**

1. Create validation schemas:
```typescript
// src/schemas/clientSchema.ts
import { z } from 'zod';

export const clientSchema = z.object({
  nom: z.string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
  telephone: z.string()
    .regex(/^\+?[0-9]{10,15}$/, 'Numéro de téléphone invalide')
    .trim(),
  ville: z.string()
    .min(1, 'La ville est requise')
    .max(100, 'La ville ne peut pas dépasser 100 caractères')
    .trim(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
```

2. Use in forms with react-hook-form:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, ClientFormData } from '@/schemas/clientSchema';

const form = useForm<ClientFormData>({
  resolver: zodResolver(clientSchema),
});
```

**Estimated Time:** 3-4 hours

---

### ✅ Task 9: Implement Security Logging

**Files to create/modify:**
- [ ] `src/services/securityLogger.ts`
- [ ] New migration for security_logs table

**Steps:**

1. Create security_logs table:
```sql
CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at);
```

2. Create security logger service:
```typescript
// src/services/securityLogger.ts
import { supabase } from '@/integrations/supabase/client';

export async function logSecurityEvent(
  eventType: string,
  severity: 'info' | 'warning' | 'critical',
  details?: any
) {
  try {
    await supabase.from('security_logs').insert({
      event_type: eventType,
      severity,
      details,
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Usage
logSecurityEvent('failed_login', 'warning', { email: 'user@example.com' });
logSecurityEvent('admin_created', 'critical', { admin_email: 'admin@example.com' });
```

**Estimated Time:** 2-3 hours

---

## 🟡 MEDIUM PRIORITY FIXES (Week 2-3)

### ✅ Task 10: Fix CORS Configuration
### ✅ Task 11: Add Security Headers
### ✅ Task 12: Implement Session Timeout
### ✅ Task 13: Enforce Email Verification
### ✅ Task 14: Set Up Dependency Scanning

---

## Testing Checklist

After implementing fixes:

- [ ] Test login with correct credentials
- [ ] Test login with incorrect credentials (rate limiting)
- [ ] Test admin access controls
- [ ] Test RLS policies (try accessing other org's data)
- [ ] Test CSP (check browser console for violations)
- [ ] Test image proxy with various URLs
- [ ] Test password validation
- [ ] Run `npm audit`
- [ ] Test session timeout
- [ ] Verify security logs are created

---

## Deployment Checklist

Before deploying to production:

- [ ] All CRITICAL fixes completed
- [ ] All HIGH fixes completed
- [ ] Environment variables configured
- [ ] Admin account created via SQL
- [ ] Security testing completed
- [ ] Penetration testing completed (if possible)
- [ ] Backup and recovery plan in place
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented

---

**Last Updated:** January 26, 2025
