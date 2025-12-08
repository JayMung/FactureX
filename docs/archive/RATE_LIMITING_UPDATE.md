# Rate Limiting - Mise à Jour Importante

**Date:** 26 janvier 2025  
**Problème résolu:** Package Upstash ne fonctionne pas côté client

---

## ⚠️ Problème Rencontré

Le package `@upstash/ratelimit` est conçu pour **Node.js/Deno** et ne fonctionne pas dans le navigateur :
```
Uncaught ReferenceError: process is not defined
```

---

## ✅ Solution Implémentée

### Version 1 : Rate Limiting Client (localStorage) - ACTUELLE

**Fichier:** `src/lib/ratelimit-client.ts`

**Avantages:**
- ✅ Fonctionne immédiatement
- ✅ Pas de configuration serveur nécessaire
- ✅ Gratuit (pas de coût Upstash)

**Inconvénients:**
- ⚠️ Peut être contourné (clear localStorage)
- ⚠️ Moins sécurisé qu'une solution serveur

**Limites:**
- **Login:** 5 tentatives / 15 minutes
- **Signup:** 3 inscriptions / 1 heure

---

## 🚀 Migration Future Recommandée

### Version 2 : Rate Limiting Serveur (Edge Functions)

**Fichier créé:** `supabase/functions/rate-limit-login/index.ts`

**Pour déployer:**

1. **Configurer Upstash dans Supabase:**
   ```bash
   # Dans Supabase Dashboard → Settings → Edge Functions → Secrets
   UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token
   ```

2. **Déployer la fonction:**
   ```bash
   npx supabase functions deploy rate-limit-login
   ```

3. **Mettre à jour le code client:**
   ```typescript
   // Appeler l'Edge Function au lieu du rate limiter local
   const response = await fetch(
     `${supabaseUrl}/functions/v1/rate-limit-login`,
     {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${supabaseAnonKey}`
       },
       body: JSON.stringify({ identifier })
     }
   );
   ```

**Avantages:**
- 🛡️ Impossible à contourner
- 🛡️ Vraie sécurité serveur
- 📊 Analytics Upstash

---

## 📊 Comparaison

| Critère | Client (Actuel) | Serveur (Future) |
|---------|----------------|------------------|
| **Sécurité** | ⚠️ Moyenne | ✅ Élevée |
| **Facilité** | ✅ Simple | ⚠️ Configuration |
| **Coût** | ✅ Gratuit | 💵 Upstash (~$0) |
| **Contournable** | ❌ Oui | ✅ Non |
| **Production Ready** | ⚠️ Acceptable | ✅ Recommandé |

---

## 🧪 Test de la Solution Actuelle

1. Allez sur `/login`
2. Essayez de vous connecter **6 fois** avec un mauvais mot de passe
3. **Résultat attendu:** Message "Trop de tentatives de connexion. Veuillez réessayer dans X minutes."

---

## 📝 Notes

- La solution actuelle est **suffisante pour le développement et les petits projets**
- Pour la **production à grande échelle**, migrer vers Edge Functions
- Le code Edge Function est **déjà prêt** dans `supabase/functions/`

---

**Status:** ✅ **FONCTIONNEL** (version client)  
**Prochaine étape:** Tester et valider
