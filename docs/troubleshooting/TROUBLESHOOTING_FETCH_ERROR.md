# Résolution de l'erreur "Failed to fetch"

## 🐛 Symptôme

```
Error fetching factures: {"message":"TypeError: Failed to fetch"}
Error fetching global totals: {"message":"TypeError: Failed to fetch"}
```

## 🔍 Causes possibles

1. **Connexion internet instable ou lente**
2. **Serveur Supabase temporairement indisponible**
3. **Rate limiting** (trop de requêtes simultanées)
4. **Cache du navigateur corrompu**
5. **Extension de navigateur** qui bloque les requêtes
6. **Firewall ou antivirus** qui bloque Supabase

## ✅ Solutions à essayer (dans l'ordre)

### 1. Hard Refresh du navigateur
**Windows**: `Ctrl + Shift + R` ou `Ctrl + F5`
**Mac**: `Cmd + Shift + R`

### 2. Vider le cache du navigateur
1. Ouvrir DevTools (`F12`)
2. Onglet "Application" (Chrome) ou "Storage" (Firefox)
3. Cliquer sur "Clear site data"
4. Rafraîchir la page

### 3. Vérifier la connexion Supabase
Ouvrir la console et tester manuellement :

```javascript
// Dans la console du navigateur
const { data, error } = await supabase.from('factures').select('*').limit(1);
console.log('Test Supabase:', { data, error });
```

Si ça fonctionne, le problème vient du code. Si ça échoue, c'est un problème réseau/Supabase.

### 4. Désactiver les extensions de navigateur
1. Ouvrir le navigateur en mode incognito
2. Tester l'application
3. Si ça fonctionne, une extension bloque les requêtes

### 5. Vérifier les variables d'environnement
```bash
# Dans le terminal
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

Ou vérifier dans `.env` :
```
VITE_SUPABASE_URL=https://ddnxtuhswmewoxrwswzg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 6. Redémarrer le serveur de développement
```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

### 7. Vérifier le statut de Supabase
Visiter : https://status.supabase.com/

### 8. Tester la connexion réseau à Supabase
```bash
# Dans le terminal
curl -I https://ddnxtuhswmewoxrwswzg.supabase.co
```

Si ça échoue, c'est un problème réseau local (firewall, VPN, etc.)

### 9. Désactiver temporairement le firewall/antivirus
Parfois, le firewall bloque les connexions à Supabase.

### 10. Vérifier les CORS (si en production)
Si le problème persiste en production, vérifier la configuration CORS dans Supabase Dashboard.

## 🔧 Solution de contournement temporaire

Si le problème persiste, ajouter un retry automatique dans les hooks :

```typescript
// Dans useFactures.ts
const fetchWithRetry = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// Utiliser dans fetchFactures
const { data, error: fetchError, count } = await fetchWithRetry(() => query);
```

## 📊 Diagnostic avancé

### Vérifier les requêtes réseau
1. Ouvrir DevTools (`F12`)
2. Onglet "Network"
3. Filtrer par "Fetch/XHR"
4. Rafraîchir la page
5. Chercher les requêtes vers `supabase.co`
6. Vérifier le statut (200 = OK, 4xx/5xx = erreur)

### Logs détaillés
Ajouter temporairement dans `useFactures.ts` :

```typescript
console.log('🔍 Fetching factures...', { page, filters });
console.log('🌐 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
```

## 🎯 Solution probable

Dans 90% des cas, c'est :
1. **Cache du navigateur** → Hard refresh
2. **Extension de navigateur** → Mode incognito
3. **Connexion internet instable** → Attendre/réessayer

## 📝 Note

L'erreur apparaît plusieurs fois car :
- `useFactures` est appelé par plusieurs composants
- Chaque composant fait sa propre requête
- Si la connexion échoue, toutes les requêtes échouent

**Solution** : Implémenter un système de cache global avec React Query (déjà en place, mais vérifier la configuration).
