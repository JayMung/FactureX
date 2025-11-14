# 📢 Organisation Discord - Guide Complet FactureX

Guide pour configurer vos canaux Discord et webhooks pour une organisation optimale des notifications.

---

## 🎯 Structure Recommandée

```
📁 FACTUREX - NOTIFICATIONS
│
├── 📢 #annonces-generales
│   └── Annonces importantes, mises à jour système
│
├── 💼 #clients
│   ├── ✅ Client créé
│   └── ✅ Client mis à jour
│
├── 📄 #factures
│   ├── ✅ Facture créée
│   ├── ✅ Facture validée
│   └── ✅ Facture payée
│
├── 📦 #colis
│   ├── ✅ Colis créé
│   ├── ✅ Colis livré
│   └── ✅ Statut colis changé
│
├── 💰 #transactions
│   ├── ✅ Transaction créée
│   └── ✅ Transaction validée
│
├── 🗑️ #suppressions
│   ├── ⚠️ Client supprimé
│   ├── ⚠️ Facture supprimée
│   ├── ⚠️ Colis supprimé
│   └── ⚠️ Transaction supprimée
│
└── ⚠️ #alertes-importantes
    ├── 🚨 Factures > 10,000 USD
    ├── 🚨 Transactions > 5,000 USD
    └── 🚨 Erreurs système
```

---

## 📋 Détails des Canaux

### 1. 💼 #clients

**Description** : Notifications pour la gestion des clients

**Événements** :
- ✅ `client.created` - Nouveau client ajouté
- ✅ `client.updated` - Informations client modifiées

**Exemple de notification** :
```
Nouveau Client

**Nom:** Mr Jordan
**Téléphone:** +243822463801
**Ville:** LUBUMBASHI

**Effectué par:** Daniel Muyela
```

**Configuration Webhook** :
1. Créer le canal `#clients`
2. Paramètres → Intégrations → Créer un webhook
3. Nom : `FactureX - Clients`
4. Copier l'URL
5. Dans FactureX → Webhooks → Créer :
   - **Nom** : `Discord - Clients`
   - **URL** : [URL copiée]
   - **Format** : Discord
   - **Événements** : ✅ Client créé, ✅ Client mis à jour

---

### 2. 📄 #factures

**Description** : Suivi complet du cycle de vie des factures

**Événements** :
- ✅ `facture.created` - Nouvelle facture créée
- ✅ `facture.validated` - Facture validée
- ✅ `facture.paid` - Facture payée

**Exemple de notification** :
```
Facture Payée

**Numéro:** FAC-2025-1113-002
**Client:** Entreprise ABC
**Total:** 5,000 USD
**Statut:** payée

**Effectué par:** Jeaney Mungedi
```

**Configuration Webhook** :
1. Créer le canal `#factures`
2. Paramètres → Intégrations → Créer un webhook
3. Nom : `FactureX - Factures`
4. Copier l'URL
5. Dans FactureX → Webhooks → Créer :
   - **Nom** : `Discord - Factures`
   - **URL** : [URL copiée]
   - **Format** : Discord
   - **Événements** : ✅ Facture créée, ✅ Facture validée, ✅ Facture payée

**Filtres optionnels** :
- Montant minimum : 1000 USD (pour ne voir que les grosses factures)
- Devise : USD

---

### 3. 📦 #colis

**Description** : Suivi des expéditions et livraisons

**Événements** :
- ✅ `colis.created` - Nouveau colis enregistré
- ✅ `colis.delivered` - Colis livré
- ✅ `colis.status_changed` - Changement de statut

**Exemple de notification** :
```
Colis Livré

**Tracking:** CN123456789
**Client:** Mr Jordan
**Poids:** 15.5 kg
**Montant:** 250 USD

**Effectué par:** Daniel Muyela
```

**Configuration Webhook** :
1. Créer le canal `#colis`
2. Paramètres → Intégrations → Créer un webhook
3. Nom : `FactureX - Colis`
4. Copier l'URL
5. Dans FactureX → Webhooks → Créer :
   - **Nom** : `Discord - Colis`
   - **URL** : [URL copiée]
   - **Format** : Discord
   - **Événements** : ✅ Colis créé, ✅ Colis livré, ✅ Statut colis changé

---

### 4. 💰 #transactions

**Description** : Suivi des opérations financières

**Événements** :
- ✅ `transaction.created` - Nouvelle transaction
- ✅ `transaction.validated` - Transaction servie/validée

**Exemple de notification** :
```
Transaction Servie

**Client:** Ephraim Mpoyi
**Montant:** $30.00 USD
**Montant CNY:** ¥199.50
**Taux:** 7.0000
**Frais:** $1.50
**Mode:** Airtel Money
**Motif:** Transfert
**Statut:** En attente

**Effectué par:** Francy Mungedi
```

**Configuration Webhook** :
1. Créer le canal `#transactions`
2. Paramètres → Intégrations → Créer un webhook
3. Nom : `FactureX - Transactions`
4. Copier l'URL
5. Dans FactureX → Webhooks → Créer :
   - **Nom** : `Discord - Transactions`
   - **URL** : [URL copiée]
   - **Format** : Discord
   - **Événements** : ✅ Transaction créée, ✅ Transaction validée

**Filtres optionnels** :
- Montant minimum : 500 USD (pour filtrer les petites transactions)

---

### 5. 🗑️ #suppressions

**Description** : ⚠️ Canal d'alerte pour toutes les suppressions (audit)

**Événements** :
- ⚠️ `client.deleted` - Client supprimé
- ⚠️ `facture.deleted` - Facture supprimée
- ⚠️ `colis.deleted` - Colis supprimé
- ⚠️ `transaction.deleted` - Transaction supprimée

**Exemple de notification** :
```
🗑️ Facture Supprimée

**Numéro:** FAC-2025-1113-002
**Client:** Entreprise ABC
**Total:** 5,000 USD
**Statut:** brouillon

**Effectué par:** Daniel Muyela
```

**Configuration Webhook** :
1. Créer le canal `#suppressions`
2. **Important** : Restreindre l'accès (seuls admins/managers)
3. Paramètres → Intégrations → Créer un webhook
4. Nom : `FactureX - Suppressions`
5. Copier l'URL
6. Dans FactureX → Webhooks → Créer :
   - **Nom** : `Discord - Suppressions`
   - **URL** : [URL copiée]
   - **Format** : Discord
   - **Événements** : ✅ Tous les événements `.deleted`

**Pourquoi un canal séparé ?**
- ✅ Audit trail complet
- ✅ Détection de suppressions accidentelles
- ✅ Sécurité (seuls admins voient)
- ✅ Couleur rouge = alerte visuelle

---

### 6. ⚠️ #alertes-importantes

**Description** : Alertes critiques nécessitant une attention immédiate

**Événements** :
- 🚨 Factures > 10,000 USD
- 🚨 Transactions > 5,000 USD
- 🚨 Erreurs système
- 🚨 Tentatives de fraude

**Configuration Webhook** :
1. Créer le canal `#alertes-importantes`
2. Paramètres → Intégrations → Créer un webhook
3. Nom : `FactureX - Alertes`
4. Copier l'URL
5. Dans FactureX → Webhooks → Créer :
   - **Nom** : `Discord - Alertes Importantes`
   - **URL** : [URL copiée]
   - **Format** : Discord
   - **Événements** : ✅ Facture payée, ✅ Transaction validée
   - **Filtres** :
     - Montant minimum : 5000 USD
     - Devise : USD

**Mentions** : Configurer `@everyone` ou `@admins` pour ces alertes

---

## 🎨 Personnalisation des Canaux

### Couleurs Recommandées

| Canal | Couleur | Raison |
|-------|---------|--------|
| #clients | 🔵 Bleu | Neutre, professionnel |
| #factures | 🟢 Vert | Argent, revenus |
| #colis | 🟣 Violet | Logistique, expédition |
| #transactions | 🟡 Jaune | Attention, finance |
| #suppressions | 🔴 Rouge | Alerte, danger |
| #alertes-importantes | 🔴 Rouge | Critique |

### Icônes Discord

Ajoutez des emojis dans les noms de canaux :
```
💼-clients
📄-factures
📦-colis
💰-transactions
🗑️-suppressions
⚠️-alertes-importantes
```

---

## 🔒 Permissions Recommandées

### Canal Public (Tous)
- ✅ #annonces-generales
- ✅ #clients
- ✅ #factures
- ✅ #colis
- ✅ #transactions

### Canal Restreint (Admins/Managers)
- 🔒 #suppressions
- 🔒 #alertes-importantes

**Configuration** :
1. Clic droit sur le canal
2. Modifier le canal → Permissions
3. Désactiver "Voir le canal" pour @everyone
4. Activer "Voir le canal" pour @Admins

---

## 📊 Configuration Complète - Étape par Étape

### Étape 1 : Créer la Catégorie

1. Serveur Discord → Créer une catégorie
2. Nom : `FACTUREX - NOTIFICATIONS`
3. Permissions : Selon vos besoins

### Étape 2 : Créer les Canaux

Pour chaque canal :
1. Clic droit sur la catégorie → Créer un salon
2. Type : Salon textuel
3. Nom : Selon la liste ci-dessus
4. Permissions : Selon le tableau

### Étape 3 : Créer les Webhooks

Pour chaque canal :
1. Paramètres du canal (⚙️)
2. Intégrations
3. Créer un webhook
4. Nom : `FactureX - [Type]`
5. Avatar : Logo FactureX (optionnel)
6. Copier l'URL du webhook
7. Sauvegarder

### Étape 4 : Configurer dans FactureX

Pour chaque webhook :
1. FactureX → Webhooks
2. Créer un webhook
3. Remplir les informations :
   - **Nom** : `Discord - [Type]`
   - **URL** : [URL copiée de Discord]
   - **Format** : Discord
   - **Événements** : Cocher les événements appropriés
   - **Filtres** : (optionnel)
4. Sauvegarder

### Étape 5 : Tester

1. Créer une facture test
2. Vérifier Discord → #factures
3. Attendre max 1-2 minutes (cron-job.org)
4. Vérifier que le message apparaît

---

## 🧪 Exemples de Configuration

### Configuration Minimale (1 canal)

**Un seul canal pour tout** :
```
#facturex-notifications
├── Tous les événements
└── Format : Discord
```

**Avantage** : Simple
**Inconvénient** : Beaucoup de bruit

---

### Configuration Standard (3 canaux)

```
#facturex-operations
├── Clients, Factures, Colis

#facturex-finance
├── Transactions, Paiements

#facturex-suppressions
├── Toutes les suppressions
```

**Avantage** : Équilibre simplicité/organisation
**Inconvénient** : Moins de granularité

---

### Configuration Avancée (6+ canaux)

```
Comme décrit au début de ce document
```

**Avantage** : Organisation maximale
**Inconvénient** : Plus de webhooks à gérer

---

## 🔧 Maintenance

### Vérifier les Webhooks

Régulièrement :
1. FactureX → Webhooks
2. Vérifier les statuts (actif/inactif)
3. Consulter les logs d'erreur
4. Tester avec des données de test

### Nettoyer les Anciens Webhooks

Si un webhook ne fonctionne plus :
1. FactureX → Webhooks
2. Désactiver ou supprimer
3. Discord → Supprimer le webhook correspondant

---

## 📱 Notifications Mobiles

Pour recevoir les notifications sur mobile :
1. Installer Discord mobile
2. Activer les notifications pour le serveur
3. Personnaliser par canal :
   - #alertes-importantes : Toutes les notifications
   - #suppressions : Toutes les notifications
   - Autres : Mentions uniquement

---

## 🎯 Cas d'Usage Réels

### Cas 1 : Petite Équipe (2-5 personnes)

**Configuration** :
- 1 canal : `#facturex-notifications`
- Tous les événements
- Tout le monde voit tout

---

### Cas 2 : Équipe Moyenne (5-15 personnes)

**Configuration** :
- 3 canaux : `#operations`, `#finance`, `#suppressions`
- Séparation par domaine
- #suppressions restreint aux managers

---

### Cas 3 : Grande Équipe (15+ personnes)

**Configuration** :
- 6+ canaux (comme décrit)
- Permissions granulaires
- Rôles Discord : @Admins, @Comptables, @Opérateurs

---

## ✅ Checklist de Configuration

- [ ] Catégorie Discord créée
- [ ] 6 canaux créés
- [ ] Permissions configurées
- [ ] 6 webhooks Discord créés
- [ ] 6 webhooks FactureX configurés
- [ ] Tests effectués sur chaque canal
- [ ] Documentation partagée avec l'équipe
- [ ] Notifications mobiles configurées

---

## 📚 Ressources

- [Documentation Discord Webhooks](https://discord.com/developers/docs/resources/webhook)
- [Guide FactureX Webhooks](./WEBHOOKS_GUIDE.md)
- [Enrichissement Webhooks](./WEBHOOKS_ENRICHMENT_SUMMARY.md)
- [Événements de Suppression](./WEBHOOK_DELETE_EVENTS.md)

---

**Dernière mise à jour** : 13 novembre 2025, 14:40  
**Version** : 1.0  
**Statut** : ✅ Production Ready
