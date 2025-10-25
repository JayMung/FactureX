# Rate Limiting avec Upstash Redis

**Date:** 26 janvier 2025  
**Task:** Task 5 - Protection contre les attaques brute force

---

## 🎯 Objectif

Implémenter un système de rate limiting pour protéger l'application contre :
- **Attaques brute force** sur le login
- **Spam d'inscriptions**
- **Abus d'API**
- **Attaques DDoS**

---

## 🔧 Configuration

### 1. Variables d'Environnement

Ajoutez dans votre fichier `.env` :

```env
VITE_UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
VITE_UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Où trouver ces valeurs :**
1. Allez sur https://console.upstash.com/
2. Sélectionnez votre database Redis
3. Copiez **REST URL** et **REST TOKEN**

### 2. Installation

```bash
npm install @upstash/ratelimit @upstash/redis
```

---

## 📊 Limites Configurées

| Action | Limite | Fenêtre | Description |
|--------|--------|---------|-------------|
| **Login** | 5 tentatives | 15 minutes | Protection brute force |
| **Signup** | 3 inscriptions | 1 heure | Anti-spam |
| **Password Reset** | 3 tentatives | 1 heure | Protection reset |
| **API Calls** | 100 requêtes | 1 minute | Protection DDoS |

---

## 🔒 Fonctionnement

### Algorithme : Sliding Window

Upstash utilise l'algorithme **Sliding Window** qui :
- Compte les requêtes dans une fenêtre de temps glissante
- Plus précis que le "Fixed Window"
- Évite les pics de requêtes à la limite de la fenêtre

**Exemple :**
```
Limite: 5 requêtes / 15 minutes

12:00 → Requête 1 ✅
12:05 → Requête 2 ✅
12:10 → Requête 3 ✅
12:12 → Requête 4 ✅
12:14 → Requête 5 ✅
12:15 → Requête 6 ❌ BLOQUÉE (trop de tentatives)
12:16 → Requête 7 ✅ (la requête 1 est sortie de la fenêtre)
```

---

## 💻 Utilisation dans le Code

### Login avec Rate Limiting

```typescript
import { rateLimiters, getClientIdentifier, checkRateLimit } from '@/lib/ratelimit';

const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    // Vérifier le rate limit
    const identifier = getClientIdentifier();
    const result = await checkRateLimit(rateLimiters.login, identifier);

    if (!result.success) {
      const resetTime = formatResetTime(result.reset);
      throw new Error(
        `Trop de tentatives. Réessayez dans ${resetTime}`
      );
    }

    // Continuer avec le login
    await supabase.auth.signInWithPassword({ email, password });
  } catch (error) {
    setError(error.message);
  }
};
```

---

## 🧪 Tests

### Test 1 : Vérifier le Rate Limiting sur Login

1. Allez sur `/login`
2. Essayez de vous connecter **6 fois** avec un mauvais mot de passe
3. **Résultat attendu** : À la 6ème tentative, message d'erreur :
   ```
   Trop de tentatives de connexion. Veuillez réessayer dans X minutes.
   ```

### Test 2 : Vérifier le Reset

1. Attendez 15 minutes
2. Essayez de vous reconnecter
3. **Résultat attendu** : La connexion fonctionne à nouveau

### Test 3 : Vérifier le Rate Limiting sur Signup

1. Allez sur `/login` → "Pas de compte? Inscrivez-vous"
2. Essayez de créer **4 comptes** différents
3. **Résultat attendu** : À la 4ème tentative, message d'erreur :
   ```
   Trop de tentatives d'inscription. Veuillez réessayer dans X minutes.
   ```

---

## 📈 Monitoring

### Voir les Statistiques dans Upstash

1. Allez sur https://console.upstash.com/
2. Sélectionnez votre database
3. Cliquez sur **"Analytics"**
4. Vous verrez :
   - Nombre de requêtes
   - Requêtes bloquées
   - Graphiques de trafic

### Logs dans l'Application

Le rate limiting log automatiquement dans la console :
```javascript
console.log('Rate limit check:', {
  success: true,
  limit: 5,
  remaining: 3,
  reset: 1706234567890
});
```

---

## 🔧 Personnalisation

### Modifier les Limites

Éditez `src/lib/ratelimit.ts` :

```typescript
// Exemple : Augmenter la limite de login à 10 tentatives / 30 minutes
login: new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "30 m"),
  analytics: true,
  prefix: "ratelimit:login",
}),
```

### Ajouter un Nouveau Rate Limiter

```typescript
export const rateLimiters = {
  // ... existants ...
  
  // Nouveau : Limite pour les exports
  export: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: true,
    prefix: "ratelimit:export",
  }),
};
```

---

## 🛡️ Sécurité

### Identification des Utilisateurs

**Actuellement :** Session ID stocké dans `sessionStorage`

**En production (recommandé) :**
- Utiliser l'adresse IP réelle via reverse proxy
- Combiner IP + User Agent
- Utiliser l'ID utilisateur pour les utilisateurs connectés

### Exemple avec IP Réelle

```typescript
// Dans un environnement avec reverse proxy (Nginx, Cloudflare)
export const getClientIdentifier = (req?: Request): string => {
  // Récupérer l'IP depuis les headers
  const ip = req?.headers.get('x-forwarded-for') || 
             req?.headers.get('x-real-ip') || 
             'unknown';
  
  return ip;
};
```

---

## ⚠️ Limitations Connues

### 1. Identification par Session ID
**Problème :** Un attaquant peut effacer sessionStorage et contourner  
**Solution future :** Utiliser l'IP réelle en production

### 2. Coût Upstash
**Gratuit jusqu'à :** 10,000 requêtes/jour  
**Au-delà :** ~$0.20 par 100,000 requêtes  
**Monitoring :** Vérifier régulièrement la console Upstash

### 3. Latence
**Impact :** +50-100ms par requête (appel à Upstash)  
**Acceptable :** Pour login/signup (actions peu fréquentes)  
**Pas recommandé :** Pour chaque requête API (trop lent)

---

## 🚀 Prochaines Améliorations

### Phase 2 : Rate Limiting Avancé

1. **IP-based rate limiting** en production
2. **Whitelist** pour les IPs de confiance
3. **Blacklist** pour les IPs malveillantes
4. **Rate limiting par endpoint** API
5. **Alertes** en cas d'attaque détectée

### Phase 3 : Analytics

1. Dashboard de monitoring
2. Alertes Slack/Email
3. Logs détaillés des attaques
4. Rapports hebdomadaires

---

## 📚 Ressources

- [Upstash Documentation](https://upstash.com/docs/redis/overall/getstarted)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [OWASP - Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)

---

## ✅ Checklist de Validation

- [x] Upstash Redis créé
- [x] Variables d'environnement configurées
- [x] Package `@upstash/ratelimit` installé
- [x] Service de rate limiting créé
- [x] Login protégé
- [x] Signup protégé
- [ ] Tests effectués
- [ ] Monitoring configuré
- [ ] Documentation lue

---

**Status:** ✅ **IMPLÉMENTÉ**  
**Date:** 26 janvier 2025, 01:15  
**Auteur:** Security Team
