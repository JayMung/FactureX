# 🔗 Guide d'Intégration n8n - FactureX API

Guide complet pour intégrer FactureX avec n8n et créer des workflows d'automatisation puissants.

## 📋 Table des Matières

- [Configuration Initiale](#configuration-initiale)
- [Exemples de Workflows](#exemples-de-workflows)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## ⚙️ Configuration Initiale

### 1. Créer une Clé API dans FactureX

1. Connectez-vous à FactureX
2. Allez dans **Paramètres > Clés API**
3. Cliquez sur **"Nouvelle Clé API"**
4. Configurez :
   - **Nom** : `n8n Integration`
   - **Type** : `Secret` (ou `Admin` pour accès complet)
   - **Permissions** : Sélectionnez selon vos besoins
   - **Expiration** : 365 jours (ou jamais)
5. **Copiez la clé** (elle commence par `sk_live_...`)

### 2. Récupérer vos Credentials

Vous aurez besoin de 3 éléments :

#### A. Clé Anon Supabase (Publique)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk
```

#### B. Votre Clé API FactureX
```
sk_live_VOTRE_CLÉ_ICI
```

#### C. Organization ID
```
00000000-0000-0000-0000-000000000001
```

---

## 🔧 Configuration du Nœud HTTP Request

### Template de Configuration

Dans n8n, créez un nœud **HTTP Request** avec cette configuration :

**Method** : `GET` (ou `POST` selon l'endpoint)

**URL** : 
```
https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions
```

**Authentication** : `None`

**Headers** :
```json
{
  "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk",
  "X-API-Key": "sk_live_VOTRE_CLÉ",
  "X-Organization-ID": "00000000-0000-0000-0000-000000000001",
  "Content-Type": "application/json"
}
```

**Query Parameters** (optionnel) :
```
limit=10
status=Servi
currency=USD
```

---

## 🎯 Exemples de Workflows

### 1. Dashboard Quotidien Discord

**Objectif** : Envoyer un résumé quotidien des statistiques à Discord

**Workflow** :
```
Schedule Trigger (Cron: 0 9 * * *)
    ↓
HTTP Request (GET /api-stats?period=1d)
    ↓
Discord (Webhook)
```

**Configuration HTTP Request** :
- **URL** : `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-stats?period=1d`
- **Headers** : (voir template ci-dessus)

**Configuration Discord** :
```json
{
  "content": "📊 **Rapport Quotidien FactureX**",
  "embeds": [{
    "title": "Statistiques du {{$now.format('DD/MM/YYYY')}}",
    "color": 3066993,
    "fields": [
      {
        "name": "💰 Total USD",
        "value": "${{$json.data.stats.total_usd}}",
        "inline": true
      },
      {
        "name": "📈 Bénéfice",
        "value": "${{$json.data.stats.total_benefice}}",
        "inline": true
      },
      {
        "name": "🔢 Transactions",
        "value": "{{$json.data.stats.nombre_transactions}}",
        "inline": true
      }
    ]
  }]
}
```

---

### 2. Alertes Transactions Importantes

**Objectif** : Recevoir une notification Discord pour chaque transaction > $500

**Workflow** :
```
Schedule Trigger (Every 5 minutes)
    ↓
HTTP Request (GET /api-transactions?min_amount=500)
    ↓
Filter (Only new transactions)
    ↓
Discord (Webhook)
```

**Configuration HTTP Request** :
- **URL** : `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-transactions?min_amount=500&limit=50`
- **Headers** : (voir template)

**Configuration Filter** :
```javascript
// Filtrer les transactions des 5 dernières minutes
const now = new Date();
const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
const transactionDate = new Date($json.created_at);

return transactionDate > fiveMinutesAgo;
```

---

### 3. Synchronisation CRM

**Objectif** : Exporter automatiquement les nouveaux clients vers un CRM externe

**Workflow** :
```
Schedule Trigger (Every hour)
    ↓
HTTP Request (GET /api-clients)
    ↓
Filter (Only new clients)
    ↓
HTTP Request (POST to CRM API)
```

**Configuration HTTP Request (FactureX)** :
- **URL** : `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-clients?limit=100`
- **Headers** : (voir template)

---

### 4. Webhook Discord en Temps Réel

**Objectif** : Créer un webhook pour recevoir des notifications instantanées

**Méthode 1 : Via l'Interface FactureX**

1. Allez dans **Paramètres > Webhooks**
2. Cliquez sur **"Nouveau Webhook"**
3. Configurez :
   - **Nom** : `Discord Alertes`
   - **URL** : `https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN`
   - **Format** : `Discord`
   - **Événements** : Sélectionnez `transaction.validated`, `colis.delivered`
   - **Filtres** : Montant min = 500 USD

**Méthode 2 : Via n8n**

**Workflow** :
```
Manual Trigger (One-time setup)
    ↓
HTTP Request (POST /api-webhooks)
```

**Configuration HTTP Request** :
- **Method** : `POST`
- **URL** : `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/api-webhooks`
- **Headers** : (voir template)
- **Body** :
```json
{
  "name": "Discord Notifications",
  "url": "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN",
  "events": ["transaction.validated", "facture.paid", "colis.delivered"],
  "format": "discord",
  "filters": {
    "montant_min": 500,
    "devise": "USD"
  }
}
```

---

### 5. Rapport Hebdomadaire par Email

**Objectif** : Envoyer un rapport hebdomadaire détaillé par email

**Workflow** :
```
Schedule Trigger (Cron: 0 9 * * 1)
    ↓
HTTP Request (GET /api-stats?period=7d)
    ↓
HTTP Request (GET /api-transactions?limit=100)
    ↓
Function (Format data)
    ↓
Send Email
```

**Configuration Function** :
```javascript
const stats = $('HTTP Request').item.json.data.stats;
const transactions = $('HTTP Request1').item.json.data.transactions;

const html = `
  <h1>Rapport Hebdomadaire FactureX</h1>
  <h2>Statistiques</h2>
  <ul>
    <li>Total USD: $${stats.total_usd}</li>
    <li>Total CDF: ${stats.total_cdf} FC</li>
    <li>Bénéfice: $${stats.total_benefice}</li>
    <li>Transactions: ${stats.nombre_transactions}</li>
  </ul>
  <h2>Top 10 Transactions</h2>
  <table>
    <tr><th>Date</th><th>Client</th><th>Montant</th></tr>
    ${transactions.slice(0, 10).map(t => `
      <tr>
        <td>${new Date(t.date_paiement).toLocaleDateString()}</td>
        <td>${t.client?.nom || 'N/A'}</td>
        <td>${t.montant} ${t.devise}</td>
      </tr>
    `).join('')}
  </table>
`;

return { html };
```

---

## 🐛 Troubleshooting

### Erreur : "Missing authorization header"

**Cause** : Headers manquants ou mal configurés

**Solution** :
1. Vérifiez que vous avez bien ajouté les 4 headers requis
2. Assurez-vous que `apikey` et `Authorization` contiennent la clé anon Supabase
3. Vérifiez que `X-API-Key` contient votre clé FactureX

### Erreur : "Invalid JWT"

**Cause** : La clé anon Supabase est incorrecte ou manquante

**Solution** :
1. Utilisez exactement cette clé anon :
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbnh0dWhzd21ld294cndzd3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjYyMDAsImV4cCI6MjA3NjU0MjIwMH0.8Yz606cdYr3W5vmoRADppwMyAg2dCRglfEtlOVKoGwk
```
2. Ajoutez-la dans `apikey` ET `Authorization: Bearer ...`

### Erreur : "Invalid or expired API key"

**Cause** : Votre clé API FactureX est invalide ou expirée

**Solution** :
1. Vérifiez que votre clé commence par `sk_live_` ou `ak_live_`
2. Créez une nouvelle clé dans FactureX si nécessaire
3. Vérifiez que la clé n'est pas expirée

### Erreur : "Rate limit exceeded"

**Cause** : Trop de requêtes en peu de temps

**Solution** :
1. Réduisez la fréquence de vos workflows
2. Utilisez une clé `Admin` pour des limites plus élevées (5000 req/h)
3. Ajoutez des délais entre les requêtes

### Aucune Donnée Retournée

**Cause** : Filtres trop restrictifs ou organization_id incorrect

**Solution** :
1. Vérifiez que `X-Organization-ID` est `00000000-0000-0000-0000-000000000001`
2. Testez sans filtres d'abord
3. Vérifiez que des données existent dans FactureX

---

## ✅ Best Practices

### 1. Sécurité

- ✅ **Ne partagez jamais** votre clé API publiquement
- ✅ **Utilisez des variables d'environnement** dans n8n pour stocker les clés
- ✅ **Créez des clés différentes** pour chaque workflow
- ✅ **Définissez des dates d'expiration** pour les clés sensibles
- ✅ **Désactivez les clés** inutilisées au lieu de les supprimer

### 2. Performance

- ✅ **Utilisez la pagination** : `limit` et `offset`
- ✅ **Filtrez côté serveur** : Utilisez les query parameters
- ✅ **Cachez les résultats** : Évitez les requêtes répétées
- ✅ **Limitez les données** : Ne récupérez que ce dont vous avez besoin
- ✅ **Utilisez les webhooks** : Pour les notifications en temps réel

### 3. Fiabilité

- ✅ **Gérez les erreurs** : Ajoutez des nœuds Error Trigger
- ✅ **Ajoutez des retry** : Pour les requêtes critiques
- ✅ **Loggez les erreurs** : Pour le debugging
- ✅ **Testez en local** : Avant de déployer en production
- ✅ **Surveillez les logs** : Dans FactureX > Paramètres > Logs d'activité

### 4. Monitoring

- ✅ **Vérifiez l'utilisation** : Dans FactureX > Paramètres > Clés API
- ✅ **Surveillez les webhooks** : Vérifiez `last_triggered_at`
- ✅ **Alertes de quota** : Configurez des alertes si proche de la limite
- ✅ **Logs d'audit** : Consultez régulièrement les logs

---

## 📊 Endpoints Disponibles

| Endpoint | Méthode | Description | Filtres Disponibles |
|----------|---------|-------------|---------------------|
| `/api-transactions` | GET | Transactions | status, currency, client_id, date_from, date_to, min_amount, max_amount, motif, type_transaction |
| `/api-clients` | GET | Clients | search, city, min_total_paid |
| `/api-factures` | GET | Factures/Devis | type, status, client_id, date_from, date_to, include_items |
| `/api-colis` | GET | Colis | status, payment_status, delivery_type, client_id, date_from, date_to, min_weight, tracking |
| `/api-stats` | GET | Statistiques | period, date_from, date_to, group_by |
| `/api-webhooks` | GET, POST, PUT, DELETE | Webhooks | - |

---

## 🎓 Ressources Supplémentaires

- **[Documentation API Complète](./API_README.md)**
- **[Guide des Clés API](./API_KEYS_INTERFACE_GUIDE.md)**
- **[Exemples de Code](./API_README.md#exemples-de-code)**
- **[Support FactureX](mailto:support@facturex.com)**

---

**Besoin d'aide ?** Contactez-nous sur Discord ou par email ! 🚀
