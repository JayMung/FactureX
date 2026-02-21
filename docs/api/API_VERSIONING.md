# API Versioning Guide

## Overview

All FactureX public API endpoints now support URL-based versioning. The current version is **v1**.

### Base URL

```
https://<project-ref>.supabase.co/functions/v1
```

### Versioned Endpoints (Recommended)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/api-transactions` | GET | List transactions |
| `/v1/api-clients` | GET | List clients |
| `/v1/api-factures` | GET | List factures/devis |
| `/v1/api-colis` | GET | List colis (parcels) |
| `/v1/api-stats` | GET | Dashboard statistics |
| `/v1/api-webhooks` | GET, POST, PUT, DELETE | Manage webhooks |

### Legacy Endpoints (Deprecated)

The following unversioned routes still work but are **deprecated** and will be removed on **2026-06-01**:

| Legacy Route | Replacement |
|-------------|-------------|
| `/api-transactions` | `/v1/api-transactions` |
| `/api-clients` | `/v1/api-clients` |
| `/api-factures` | `/v1/api-factures` |
| `/api-colis` | `/v1/api-colis` |
| `/api-stats` | `/v1/api-stats` |
| `/api-webhooks` | `/v1/api-webhooks` |

---

## How Versioning Works

### 1. URL Path (Primary)

Include the version prefix in the URL path:

```bash
# Versioned (recommended)
curl https://<ref>.supabase.co/functions/v1/api-transactions \
  -H "X-API-Key: sk_live_..." \
  -H "X-Organization-ID: org_..."

# Legacy (deprecated, still works)
curl https://<ref>.supabase.co/functions/v1/api-transactions \
  -H "X-API-Key: sk_live_..." \
  -H "X-Organization-ID: org_..."
```

### 2. Header Override (Alternative)

You can also specify the version via the `X-API-Version` header. This takes precedence over the URL path:

```bash
curl https://<ref>.supabase.co/functions/v1/api-transactions \
  -H "X-API-Key: sk_live_..." \
  -H "X-Organization-ID: org_..." \
  -H "X-API-Version: v1"
```

---

## Response Format

### Versioned Request Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "generated_at": "2026-02-17T10:00:00.000Z",
    "organization_id": "org_...",
    "api_version": "v1",
    "response_time_ms": 42
  }
}
```

### Legacy Request Response

Legacy (unversioned) requests include deprecation metadata:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "generated_at": "2026-02-17T10:00:00.000Z",
    "organization_id": "org_...",
    "api_version": "v1",
    "deprecated": true,
    "sunset": "2026-06-01",
    "migration_url": "/v1/api-transactions",
    "response_time_ms": 42
  }
}
```

### Response Headers

All responses include:

| Header | Description |
|--------|-------------|
| `X-API-Version` | The resolved API version (always `v1` currently) |

Legacy requests additionally include:

| Header | Description |
|--------|-------------|
| `Deprecation` | `true` — indicates the route is deprecated |
| `Sunset` | `2026-06-01` — date when the legacy route will be removed |
| `X-API-Deprecation-Notice` | Human-readable migration instructions |

---

## Migration Guide

### Step 1: Update Base URLs

Replace all unversioned endpoint URLs with their `/v1/` equivalents:

```diff
- const BASE = 'https://<ref>.supabase.co/functions/v1/api-transactions'
+ const BASE = 'https://<ref>.supabase.co/functions/v1/api-transactions'
```

For Supabase Edge Function invocations:

```diff
- /api-transactions?status=Servi
+ /v1/api-transactions?status=Servi
```

### Step 2: Handle Version Metadata

Optionally read the `api_version` field from `meta` in responses to confirm you're hitting the expected version.

### Step 3: Monitor Deprecation Headers

If your integration receives `Deprecation: true` in response headers, it means you're still using a legacy route. Update your URLs.

### Step 4: Test

Verify all integrations (n8n, Discord webhooks, custom scripts) work with the new `/v1/` prefix.

---

## Authentication & Rate Limiting

Authentication and rate limiting work identically on both versioned and legacy routes:

- **API Key**: `X-API-Key` header or `Authorization: Bearer <key>`
- **Organization**: `X-Organization-ID` header
- **Rate Limits**: Applied per API key type (public: 100/h, secret: 1000/h, admin: 5000/h)

No changes are required to your authentication setup.

---

## Future Versions

When a new API version (e.g., `v2`) is introduced:

1. The new version will be available at `/v2/api-*`
2. The previous version (`v1`) will enter a deprecation period
3. Deprecation headers will be added to `v1` responses
4. After the sunset date, `v1` routes will return `410 Gone`

---

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `_shared/api-version.ts` | **New** — Version constants, extraction, deprecation headers |
| `_shared/api-types.ts` | Added `api_version`, `deprecated`, `sunset`, `migration_url` to `ApiResponse.meta` |
| `_shared/api-response.ts` | Added `versionedJsonResponse()` helper, updated `formatForN8n()` version |
| `api-transactions/index.ts` | Versioned routing + deprecation headers |
| `api-clients/index.ts` | Versioned routing + deprecation headers |
| `api-factures/index.ts` | Versioned routing + deprecation headers |
| `api-colis/index.ts` | Versioned routing + deprecation headers |
| `api-stats/index.ts` | Versioned routing + deprecation headers |
| `api-webhooks/index.ts` | Versioned routing + deprecation headers |

### CORS

The `x-api-version` header has been added to `Access-Control-Allow-Headers` in all endpoints to support the version header from browser-based clients.
