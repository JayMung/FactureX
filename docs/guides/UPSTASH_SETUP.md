# Configuration Upstash - Instructions

## 🔑 Récupérer vos Credentials

1. **Allez sur** https://console.upstash.com/
2. **Connectez-vous** avec votre compte
3. **Sélectionnez** votre database Redis (ou créez-en une si nécessaire)
4. **Copiez** les valeurs suivantes :
   - **REST URL** (commence par `https://`)
   - **REST TOKEN** (longue chaîne de caractères)

## 📝 Ajouter dans .env

Ouvrez votre fichier `.env` et ajoutez :

```env
VITE_UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
VITE_UPSTASH_REDIS_REST_TOKEN=votre_token_upstash_ici
```

## ⚠️ IMPORTANT

- **NE COMMITEZ JAMAIS** le fichier `.env` (il est déjà dans `.gitignore`)
- Les credentials sont **secrets** et **personnels**
- En production (Vercel/VPS), ajoutez ces variables dans les settings

## 🧪 Tester la Configuration

Une fois les credentials ajoutés, testez :

1. Rechargez l'application
2. Allez sur `/login`
3. Essayez de vous connecter 6 fois avec un mauvais mot de passe
4. Vous devriez voir : "Trop de tentatives de connexion..."

## 🎯 Prochaines Étapes

1. ✅ Ajouter credentials dans `.env`
2. ✅ Tester le rate limiting
3. ✅ Commit et push le code
4. ⏳ Configurer en production (Vercel/VPS)
