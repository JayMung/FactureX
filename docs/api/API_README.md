# 🚀 FactureX External API

API RESTful sécurisée pour intégrer FactureX avec n8n, Discord, et autres outils d'automatisation.

## ⚡ Quick Start

### 1. Créer une Clé API

```bash
# Via l'interface FactureX
Paramètres > API > Générer une clé
```

### 2. Faire votre Première Requête

```bash
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions?limit=10" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk" \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: 00000000-0000-0000-0000-000000000001"
```

### 3. Configurer un Webhook Discord

```bash
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: votre_org_id" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discord Alertes",
    "url": "https://discord.com/api/webhooks/...",
    "events": ["transaction.validated"],
    "format": "discord"
  }'
```

## 📚 Documentation

- **[Guide Complet de l'API](./API_GUIDE.md)** - Documentation complète des endpoints
- **[Guide d'Implémentation](./API_IMPLEMENTATION_GUIDE.md)** - Déploiement étape par étape
- **[Intégration n8n](./N8N_INTEGRATION.md)** - Workflows n8n prêts à l'emploi
- **[Webhooks Discord](./DISCORD_WEBHOOKS.md)** - Configuration Discord avancée

## 🎯 Endpoints Principaux

| Endpoint | Méthode | Description | Permissions |
|----------|---------|-------------|-------------|
| `/api-transactions` | GET | Récupérer les transactions | `read:transactions` |
| `/api-clients` | GET | Récupérer les clients | `read:clients` |
| `/api-factures` | GET | Récupérer les factures | `read:factures` |
| `/api-stats` | GET | Récupérer les statistiques | `read:stats` |
| `/api-webhooks` | POST | Créer un webhook | `write:webhooks` |

## 🔐 Authentification

Toutes les requêtes nécessitent ces headers :

```http
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk
X-API-Key: sk_live_votre_clé_secrète
X-Organization-ID: 00000000-0000-0000-0000-000000000001
```

**Important** : 
- `apikey` et `Authorization` : Clé anon Supabase (pour passer la validation JWT)
- `X-API-Key` : Votre clé API FactureX (créée dans Paramètres > Clés API)
- `X-Organization-ID` : Votre organization ID (toujours `00000000-0000-0000-0000-000000000001`)

### Types de Clés

- **Public** (`pk_live_`) : Lecture seule, 100 req/h
- **Secret** (`sk_live_`) : Lecture + Webhooks, 1000 req/h
- **Admin** (`ak_live_`) : Accès complet, 5000 req/h

## 🔔 Webhooks

Recevez des notifications en temps réel pour :

### Événements Transactions
- `transaction.created` - Nouvelle transaction
- `transaction.validated` - Transaction servie
- `transaction.deleted` - Transaction supprimée

### Événements Factures
- `facture.created` - Nouvelle facture/devis
- `facture.validated` - Facture validée
- `facture.paid` - Facture payée

### Événements Clients
- `client.created` - Nouveau client
- `client.updated` - Client mis à jour

### Événements Colis
- `colis.created` - Nouveau colis
- `colis.delivered` - Colis livré
- `colis.status_changed` - Statut changé

### Formats Supportés

- **JSON** : Format standard pour toutes intégrations
- **Discord** : Embeds Discord riches avec couleurs et champs
- **n8n** : Format optimisé pour n8n workflows
- **Slack** : Messages Slack formatés (blocks)

### Gestion des Webhooks

**Via l'Interface FactureX** :
1. Allez dans **Paramètres > Webhooks**
2. Cliquez sur **"Nouveau Webhook"**
3. Configurez : nom, URL, événements, format, filtres
4. Activez/désactivez sans supprimer

**Via l'API** :
```bash
# Créer un webhook
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Discord Notifications",
    "url": "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN",
    "events": ["transaction.validated", "colis.delivered"],
    "format": "discord",
    "filters": {
      "montant_min": 500,
      "devise": "USD"
    }
  }'
```

## 💻 Exemples de Code

### JavaScript

```javascript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk';

const response = await fetch(
  'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions?status=Servi',
  {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'X-API-Key': 'sk_live_votre_clé',
      'X-Organization-ID': '00000000-0000-0000-0000-000000000001'
    }
  }
);
const data = await response.json();
console.log(data);
```

### Python

```python
import requests

SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk'

response = requests.get(
    'https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions',
    headers={
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'X-API-Key': 'sk_live_votre_clé',
        'X-Organization-ID': '00000000-0000-0000-0000-000000000001'
    },
    params={'status': 'Servi', 'limit': 10}
)
data = response.json()
print(data)
```

### cURL

```bash
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-stats?period=7d" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk" \
  -H "X-API-Key: sk_live_votre_clé" \
  -H "X-Organization-ID: 00000000-0000-0000-0000-000000000001"
```

### n8n HTTP Request Node

**Configuration** :
- **Method** : GET
- **URL** : `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions`
- **Authentication** : None
- **Headers** :
  ```json
  {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk",
    "X-API-Key": "sk_live_votre_clé",
    "X-Organization-ID": "00000000-0000-0000-0000-000000000001"
  }
  ```
- **Query Parameters** : `limit=10&status=Servi`

## 🛠️ Cas d'Usage

### 1. Dashboard Temps Réel avec n8n

Récupérez les statistiques toutes les heures et envoyez-les à Discord/Slack.

### 2. Alertes de Transactions

Recevez une notification Discord pour chaque transaction > $1000.

### 3. Synchronisation CRM

Exportez automatiquement les nouveaux clients vers votre CRM.

### 4. Rapports Automatiques

Générez des rapports quotidiens/hebdomadaires et envoyez-les par email.

### 5. Monitoring Financier

Surveillez les métriques clés et déclenchez des alertes si anomalies.

## 📊 Rate Limits

| Type de Clé | Requêtes/Heure | Burst |
|-------------|----------------|-------|
| Public | 100 | 10/min |
| Secret | 1000 | 50/min |
| Admin | 5000 | 100/min |

## ❌ Codes d'Erreur

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Clé API invalide |
| `FORBIDDEN` | 403 | Permissions insuffisantes |
| `RATE_LIMIT_EXCEEDED` | 429 | Trop de requêtes |
| `VALIDATION_ERROR` | 400 | Paramètres invalides |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │ (n8n, Discord, Custom App)
└──────┬──────┘
       │ HTTPS + API Key
       ▼
┌─────────────────────────────────────┐
│   Supabase Edge Functions (Deno)   │
│  ┌──────────────────────────────┐  │
│  │  Authentication & Rate Limit │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  API Endpoints               │  │
│  │  - Transactions              │  │
│  │  - Clients                   │  │
│  │  - Factures                  │  │
│  │  - Stats                     │  │
│  │  - Webhooks                  │  │
│  └──────────────────────────────┘  │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│   PostgreSQL Database (Supabase)   │
│  ┌──────────────────────────────┐  │
│  │  Tables                      │  │
│  │  - api_keys                  │  │
│  │  - webhooks                  │  │
│  │  - api_audit_logs            │  │
│  │  - webhook_logs              │  │
│  │  - transactions              │  │
│  │  - clients                   │  │
│  │  - factures                  │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  RLS Policies                │  │
│  │  Multi-tenancy Security      │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 🔒 Sécurité

- ✅ **Authentification** : Clés API avec hash SHA-256
- ✅ **Permissions** : Contrôle granulaire par endpoint
- ✅ **Rate Limiting** : Protection contre les abus
- ✅ **RLS** : Isolation des données par organisation
- ✅ **Audit Logs** : Traçabilité complète
- ✅ **HTTPS** : Chiffrement TLS 1.3
- ✅ **Webhook Signatures** : Vérification HMAC

## 📦 Installation

### Prérequis

- Supabase CLI installé
- Accès au projet Supabase
- Node.js 18+ (pour les tests locaux)

### Déploiement

```bash
# 1. Appliquer la migration
supabase db push

# 2. Déployer les Edge Functions
supabase functions deploy api-transactions
supabase functions deploy api-clients
supabase functions deploy api-factures
supabase functions deploy api-stats
supabase functions deploy api-webhooks

# 3. Configurer les secrets
supabase secrets set UPSTASH_REDIS_REST_URL=...
supabase secrets set UPSTASH_REDIS_REST_TOKEN=...
```

Voir [API_IMPLEMENTATION_GUIDE.md](./API_IMPLEMENTATION_GUIDE.md) pour les détails.

## 🧪 Tests

```bash
# Test endpoint
curl -X GET "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions?limit=1" \
  -H "X-API-Key: sk_live_test" \
  -H "X-Organization-ID: org_test"

# Test webhook
curl -X POST "https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks" \
  -H "X-API-Key: sk_live_test" \
  -H "X-Organization-ID: org_test" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","url":"https://webhook.site/...","events":["transaction.created"],"format":"json"}'
```

## 📈 Monitoring

### Dashboard SQL

```sql
-- Statistiques d'utilisation
SELECT * FROM get_api_usage_stats('org_id', 24);

-- Clés actives
SELECT name, type, last_used_at FROM api_keys WHERE is_active = true;

-- Webhooks actifs
SELECT name, events, last_triggered_at FROM webhooks WHERE is_active = true;
```

### Logs

```sql
-- Dernières requêtes
SELECT * FROM api_audit_logs ORDER BY created_at DESC LIMIT 50;

-- Erreurs récentes
SELECT * FROM api_audit_logs WHERE status_code >= 400 ORDER BY created_at DESC;

-- Webhooks déclenchés
SELECT * FROM webhook_logs ORDER BY triggered_at DESC LIMIT 50;
```

## 🤝 Support

- **Documentation** : Voir les fichiers dans `docs/`
- **Issues** : GitHub Issues
- **Email** : support@facturex.com
- **Discord** : [Rejoindre le serveur](https://discord.gg/facturex)

## 📝 Changelog

### v1.0.0 (2025-01-13)

- 🎉 Lancement initial de l'API
- ✅ **6 Endpoints déployés** : transactions, clients, factures, colis, stats, webhooks
- ✅ **Interface de gestion des clés API** : Création, modification, suppression via FactureX
- ✅ **Interface de gestion des webhooks** : Configuration visuelle complète
- ✅ **11 événements webhooks** : Transactions, factures, clients, colis
- ✅ **4 formats supportés** : JSON, Discord, Slack, n8n
- ✅ **Authentification multi-couches** : Clé Supabase anon + Clé API FactureX
- ✅ **RLS policies** : Sécurité multi-tenant complète
- ✅ **Rate limiting** : Protection avec Upstash Redis (optionnel)
- ✅ **Audit logs** : Traçabilité complète des requêtes
- ✅ **Documentation complète** : Guides, exemples, intégration n8n
- ✅ **Filtres webhooks** : Montant minimum, devise, client spécifique
- ✅ **Organization ID** : `00000000-0000-0000-0000-000000000001`

## 📄 Licence

Propriétaire - FactureX © 2025

---

**Prêt à automatiser votre workflow ? Commencez maintenant ! 🚀**

[📖 Lire le Guide Complet](./API_GUIDE.md) | [🛠️ Guide d'Implémentation](./API_IMPLEMENTATION_GUIDE.md) | [🔗 Intégration n8n](./N8N_INTEGRATION.md)
