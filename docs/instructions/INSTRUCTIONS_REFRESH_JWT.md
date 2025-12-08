# 🔄 Instructions pour rafraîchir votre session

## ⚠️ IMPORTANT : Rafraîchir votre JWT

Vos transactions existent dans la base de données mais ne s'affichent pas car votre JWT (token d'authentification) ne contient pas encore l'`organization_id` mis à jour.

## 🎯 Solution : Déconnexion/Reconnexion

### Étape 1 : Déconnectez-vous
1. Cliquez sur votre profil en haut à droite
2. Cliquez sur "Déconnexion"

### Étape 2 : Reconnectez-vous
1. Connectez-vous avec : **mungedijeancy@gmail.com**
2. Entrez votre mot de passe

### Étape 3 : Vérifiez
1. Allez sur `/transactions`
2. Vous devriez maintenant voir **15 transactions** catégorisées comme "Revenue"

## 📊 Ce qui a été fait

✅ **15 transactions** trouvées dans la base
✅ Toutes catégorisées comme **revenue**
✅ Toutes avec l'**organization_id** correct
✅ Motifs : Commande, Transfert
✅ Montants et devises préservés

## 🔍 Vérification technique

Si après reconnexion les transactions ne s'affichent toujours pas :

1. Ouvrez la console (F12)
2. Tapez : `localStorage.clear()` puis Enter
3. Rafraîchissez la page (F5)
4. Reconnectez-vous

---

**Une fois reconnecté, toutes vos transactions devraient s'afficher !** 🎉
