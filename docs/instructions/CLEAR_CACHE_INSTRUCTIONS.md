# Instructions pour vider le cache complètement

## Méthode 1 : Via DevTools (RECOMMANDÉ)

1. **Ouvrir DevTools** : `F12`
2. **Onglet "Application"** (Chrome) ou "Storage" (Firefox)
3. **Cliquer sur "Clear site data"** dans le panneau de gauche
4. **Cocher toutes les cases** :
   - ✅ Cookies and site data
   - ✅ Cache storage
   - ✅ Application cache
   - ✅ Local storage
   - ✅ Session storage
   - ✅ IndexedDB
5. **Cliquer sur "Clear site data"**
6. **Fermer complètement le navigateur**
7. **Rouvrir et aller sur http://localhost:8080**

## Méthode 2 : Hard Refresh avec DevTools ouvert

1. **Ouvrir DevTools** : `F12`
2. **Cliquer droit sur le bouton refresh** (à côté de la barre d'adresse)
3. **Sélectionner "Empty Cache and Hard Reload"**

## Méthode 3 : Mode Incognito

1. **Ouvrir une fenêtre incognito** : `Ctrl + Shift + N`
2. **Aller sur http://localhost:8080**
3. Si ça fonctionne en incognito, c'est bien un problème de cache

## Méthode 4 : Supprimer le dossier .vite

Dans le terminal :
```bash
# Arrêter le serveur (Ctrl+C)
rm -rf node_modules/.vite
npm run dev
```

## Vérification

Après avoir vidé le cache, ouvrez la console (`F12` → Console) et tapez :
```javascript
console.log('Mode:', import.meta.env.MODE);
console.log('PROD:', import.meta.env.PROD);
console.log('DEV:', import.meta.env.DEV);
```

Vous devriez voir :
- Mode: "development"
- PROD: false
- DEV: true
