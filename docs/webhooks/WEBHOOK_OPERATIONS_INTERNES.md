# 💼 Webhooks Opérations Internes - Guide Complet

**Date** : 14 novembre 2025  
**Version** : 2.0.3  
**Module** : Opérations Internes (Dépenses, Revenus, Transferts)

---

## 🎯 Objectif

Documenter les webhooks pour les **Opérations Internes** qui utilisent la même table `transactions` mais avec des types différents : `depense`, `revenue`, `transfert`.

---

## 📊 Types d'Opérations

| Type | Description | Comptes Utilisés |
|------|-------------|------------------|
| **Revenue** 💵 | Entrée d'argent (revenus) | `compte_destination_id` |
| **Dépense** 💸 | Sortie d'argent (dépenses) | `compte_source_id` |
| **Transfert** 🔄 | Transfert entre comptes | `compte_source_id` + `compte_destination_id` |

---

## 📋 Exemples de Notifications Discord

### 1. Revenue (Entrée d'Argent) 💵

```
Nouvelle Transaction

**Type:** 💵 Revenue
**Catégorie:** Vente marchandise
**Compte Destination:** Cash Bureau
**Montant:** $500.00 USD
**Mode:** Espèces
**Motif:** Vente produits divers
**Notes:** Vente journée du 14/11
**Statut:** Servi

**Effectué par:** Francy Mungedi
```

**Cas d'usage** :
- Vente de marchandises
- Revenus divers
- Commissions reçues
- Remboursements reçus

---

### 2. Dépense (Sortie d'Argent) 💸

```
Nouvelle Transaction

**Type:** 💸 Dépense
**Catégorie:** Frais de transport
**Compte Source:** Airtel Money
**Montant:** $50.00 USD
**Mode:** Mobile Money
**Motif:** Transport marchandises
**Notes:** Livraison colis clients
**Statut:** Servi

**Effectué par:** Daniel Muyela
```

**Cas d'usage** :
- Frais de transport
- Achats fournitures
- Salaires
- Loyer et charges
- Frais bancaires

---

### 3. Transfert (Entre Comptes) 🔄

```
Nouvelle Transaction

**Type:** 🔄 Transfert
**Compte Source:** Cash Bureau
**Compte Destination:** Airtel Money
**Montant:** $200.00 USD
**Frais:** $2.00
**Mode:** Mobile Money
**Motif:** Réapprovisionnement compte mobile
**Notes:** Transfert pour paiements clients
**Statut:** Servi

**Effectué par:** Francy Mungedi
```

**Cas d'usage** :
- Réapprovisionnement comptes
- Équilibrage de trésorerie
- Dépôts bancaires
- Retraits d'argent

---

## 🆚 Comparaison : Transactions Clients vs Opérations Internes

### Transactions Clients (avec Client)

```
Transaction Servie

**Type:** 💵 Revenue
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

**Caractéristiques** :
- ✅ Client présent
- ✅ Montant CNY et Taux (pour change)
- ✅ Bénéfice calculé
- ❌ Pas de comptes source/destination

---

### Opérations Internes (sans Client)

```
Nouvelle Transaction

**Type:** 💸 Dépense
**Catégorie:** Frais de bureau
**Compte Source:** Cash Bureau
**Montant:** $100.00 USD
**Mode:** Espèces
**Motif:** Achat fournitures
**Notes:** Papiers, stylos, etc.
**Statut:** Servi

**Effectué par:** Admin User
```

**Caractéristiques** :
- ❌ Pas de client
- ✅ Type d'opération (revenue/depense/transfert)
- ✅ Catégorie
- ✅ Comptes source/destination
- ✅ Notes additionnelles

---

## 🎨 Catégories Recommandées

### Pour les Dépenses 💸

| Catégorie | Exemples |
|-----------|----------|
| **Frais de transport** | Livraisons, déplacements |
| **Fournitures** | Papeterie, matériel |
| **Salaires** | Paiements employés |
| **Loyer** | Bureau, entrepôt |
| **Services** | Internet, électricité |
| **Frais bancaires** | Commissions, frais |
| **Marketing** | Publicité, promotion |
| **Maintenance** | Réparations, entretien |

### Pour les Revenus 💵

| Catégorie | Exemples |
|-----------|----------|
| **Vente marchandise** | Produits vendus |
| **Services** | Prestations |
| **Commissions** | Commissions reçues |
| **Remboursements** | Remboursements clients |
| **Intérêts** | Intérêts bancaires |
| **Autres revenus** | Revenus divers |

### Pour les Transferts 🔄

| Catégorie | Exemples |
|-----------|----------|
| **Réapprovisionnement** | Entre comptes |
| **Dépôt bancaire** | Cash → Banque |
| **Retrait** | Banque → Cash |
| **Équilibrage** | Ajustements |

---

## 🔄 Workflow Complet

### Dépense

```
1. Utilisateur crée une dépense
   └─> Page Opérations Internes

2. Formulaire rempli :
   ├─> Type: Dépense
   ├─> Catégorie: Frais de transport
   ├─> Compte Source: Airtel Money
   ├─> Montant: $50.00
   └─> Motif: Transport marchandises

3. INSERT dans transactions
   └─> type_transaction = 'depense'

4. Trigger webhook_transactions_trigger
   └─> Événement: transaction.created

5. Enrichissement :
   ├─> Récupération user_info
   ├─> Récupération compte_source_nom
   └─> Formatage Discord

6. Notification Discord :
   └─> Type: 💸 Dépense
   └─> Compte Source: Airtel Money
```

### Revenue

```
1. Utilisateur crée un revenue
   └─> Page Opérations Internes

2. Formulaire rempli :
   ├─> Type: Revenue
   ├─> Catégorie: Vente marchandise
   ├─> Compte Destination: Cash Bureau
   ├─> Montant: $500.00
   └─> Motif: Vente produits

3. INSERT dans transactions
   └─> type_transaction = 'revenue'

4. Trigger webhook_transactions_trigger
   └─> Événement: transaction.created

5. Enrichissement :
   ├─> Récupération user_info
   ├─> Récupération compte_destination_nom
   └─> Formatage Discord

6. Notification Discord :
   └─> Type: 💵 Revenue
   └─> Compte Destination: Cash Bureau
```

### Transfert

```
1. Utilisateur crée un transfert
   └─> Page Opérations Internes

2. Formulaire rempli :
   ├─> Type: Transfert
   ├─> Compte Source: Cash Bureau
   ├─> Compte Destination: Airtel Money
   ├─> Montant: $200.00
   ├─> Frais: $2.00
   └─> Motif: Réapprovisionnement

3. INSERT dans transactions
   └─> type_transaction = 'transfert'

4. Trigger webhook_transactions_trigger
   └─> Événement: transaction.created

5. Enrichissement :
   ├─> Récupération user_info
   ├─> Récupération compte_source_nom
   ├─> Récupération compte_destination_nom
   └─> Formatage Discord

6. Notification Discord :
   └─> Type: 🔄 Transfert
   └─> Comptes Source + Destination
```

---

## 📊 Champs Affichés par Type

### Champs Communs (Tous Types)

- ✅ Type (Revenue/Dépense/Transfert)
- ✅ Montant
- ✅ Mode de paiement
- ✅ Motif
- ✅ Statut
- ✅ Effectué par

### Champs Spécifiques

| Champ | Revenue | Dépense | Transfert |
|-------|---------|---------|-----------|
| **Client** | ❌ | ❌ | ❌ |
| **Catégorie** | ✅ | ✅ | ✅ |
| **Compte Source** | ❌ | ✅ | ✅ |
| **Compte Destination** | ✅ | ❌ | ✅ |
| **Frais** | ✅ | ✅ | ✅ |
| **Notes** | ✅ | ✅ | ✅ |
| **Montant CNY** | ❌ | ❌ | ❌ |
| **Taux** | ❌ | ❌ | ❌ |

---

## 🎨 Organisation Discord

### Option 1 : Canal Unique

```
📁 FACTUREX - NOTIFICATIONS
└── 💰 #operations-financieres
    ├── Transactions Clients (avec client)
    └── Opérations Internes (sans client)
```

**Avantage** : Tout au même endroit

### Option 2 : Canaux Séparés

```
📁 FACTUREX - NOTIFICATIONS
├── 👥 #transactions-clients
│   └── Transactions avec clients
└── 💼 #operations-internes
    ├── Dépenses
    ├── Revenus
    └── Transferts
```

**Avantage** : Séparation claire

### Option 3 : Par Type d'Opération

```
📁 FACTUREX - NOTIFICATIONS
├── 💵 #revenus
│   ├── Transactions clients (revenue)
│   └── Opérations internes (revenue)
├── 💸 #depenses
│   └── Opérations internes (depense)
└── 🔄 #transferts
    └── Opérations internes (transfert)
```

**Avantage** : Organisation par flux financier

---

## 🧪 Tests

### Test 1 : Créer une Dépense

1. **Aller dans** Opérations Internes
2. **Créer une dépense** :
   - Type : Dépense
   - Catégorie : Frais de transport
   - Compte Source : Airtel Money
   - Montant : $50.00
   - Motif : Transport marchandises

3. **Vérifier Discord** (1-2 min) :
   ```
   Nouvelle Transaction
   
   **Type:** 💸 Dépense
   **Catégorie:** Frais de transport
   **Compte Source:** Airtel Money
   **Montant:** $50.00 USD
   ...
   ```

### Test 2 : Créer un Revenue

1. **Créer un revenue** :
   - Type : Revenue
   - Catégorie : Vente marchandise
   - Compte Destination : Cash Bureau
   - Montant : $500.00

2. **Vérifier Discord** :
   ```
   Nouvelle Transaction
   
   **Type:** 💵 Revenue
   **Catégorie:** Vente marchandise
   **Compte Destination:** Cash Bureau
   ...
   ```

### Test 3 : Créer un Transfert

1. **Créer un transfert** :
   - Type : Transfert
   - Compte Source : Cash Bureau
   - Compte Destination : Airtel Money
   - Montant : $200.00
   - Frais : $2.00

2. **Vérifier Discord** :
   ```
   Nouvelle Transaction
   
   **Type:** 🔄 Transfert
   **Compte Source:** Cash Bureau
   **Compte Destination:** Airtel Money
   ...
   ```

---

## 📝 Configuration Webhook

### Créer un Webhook pour Opérations Internes

1. **Discord** : Créer le canal `#operations-internes`
2. **Webhook Discord** : Copier l'URL
3. **FactureX → Webhooks** :
   - Nom : Discord - Opérations Internes
   - URL : [URL Discord]
   - Format : Discord
   - Événements :
     - ✅ Transaction créée
     - ✅ Transaction validée
     - ✅ Transaction supprimée

### Filtres Optionnels

**Filtrer par type** :
- Créer 3 webhooks séparés avec filtres JSON :
  ```json
  {
    "type_transaction": "depense"
  }
  ```

**Filtrer par montant** :
- Montant minimum : $100 (pour les grosses opérations)

**Filtrer par catégorie** :
- Créer un webhook pour "Salaires" uniquement

---

## 🔍 Vérification

### Vérifier les Logs

```sql
-- Vérifier les opérations internes
SELECT 
  event,
  payload->>'type_transaction' as type,
  payload->>'categorie' as categorie,
  payload->>'montant' as montant,
  status,
  created_at
FROM webhook_logs
WHERE event = 'transaction.created'
  AND (payload->>'type_transaction' IN ('depense', 'revenue', 'transfert'))
ORDER BY created_at DESC
LIMIT 10;
```

### Statistiques par Type

```sql
-- Statistiques des webhooks par type d'opération
SELECT 
  payload->>'type_transaction' as type,
  COUNT(*) as total,
  SUM((payload->>'montant')::numeric) as montant_total
FROM webhook_logs
WHERE event = 'transaction.created'
  AND status = 'success'
GROUP BY payload->>'type_transaction'
ORDER BY total DESC;
```

---

## 📊 Comparaison Complète

| Aspect | Transactions Clients | Opérations Internes |
|--------|---------------------|---------------------|
| **Table** | `transactions` | `transactions` |
| **Client** | ✅ Oui | ❌ Non |
| **Type** | revenue (implicite) | revenue/depense/transfert |
| **Catégorie** | ❌ Non | ✅ Oui |
| **Comptes** | ❌ Non | ✅ Oui |
| **Montant CNY** | ✅ Oui | ❌ Non |
| **Taux** | ✅ Oui | ❌ Non |
| **Bénéfice** | ✅ Oui | ❌ Non |
| **Notes** | ✅ Oui | ✅ Oui |
| **Webhook** | ✅ Oui | ✅ Oui |

---

## 🎯 Cas d'Usage Réels

### 1. Suivi des Dépenses

**Besoin** : Être notifié de toutes les dépenses

**Solution** :
- Webhook avec filtre `type_transaction = 'depense'`
- Canal Discord `#depenses`
- Alerte si montant > $500

### 2. Validation des Revenus

**Besoin** : Valider les revenus avant comptabilisation

**Solution** :
- Webhook `transaction.created` (type=revenue)
- Mention @comptable sur Discord
- Validation manuelle

### 3. Audit des Transferts

**Besoin** : Tracer tous les transferts entre comptes

**Solution** :
- Webhook `transaction.created` (type=transfert)
- Canal Discord `#transferts`
- Historique complet avec comptes source/destination

### 4. Alertes Grosses Dépenses

**Besoin** : Être alerté pour dépenses > $1,000

**Solution** :
- Webhook avec filtre montant minimum
- Mention @admins
- Validation requise

---

## ✅ Checklist de Validation

- [x] Edge Function mise à jour avec types d'opérations
- [x] Support des catégories
- [x] Support des comptes source/destination
- [x] Support des notes
- [x] Emojis par type (💵 💸 🔄)
- [x] Documentation complète
- [x] Exemples pour chaque type
- [x] Edge Function déployée

---

## 📚 Documentation Associée

- **Transactions Enrichment** : `docs/webhooks/WEBHOOK_TRANSACTIONS_ENRICHMENT.md`
- **Encaissements** : `docs/webhooks/WEBHOOK_ENCAISSEMENTS_COMPLETE.md`
- **Discord Setup** : `docs/integrations/DISCORD_CHANNELS_SETUP.md`
- **Webhooks Guide** : `docs/webhooks/WEBHOOKS_GUIDE.md`

---

## 🎉 Résultat Final

### Couverture Complète

| Module | Type | Webhook | Exemple |
|--------|------|---------|---------|
| **Transactions Clients** | revenue (avec client) | ✅ | Client + CNY + Taux |
| **Revenue** | revenue (sans client) | ✅ | Compte Destination |
| **Dépense** | depense | ✅ | Compte Source |
| **Transfert** | transfert | ✅ | Source + Destination |

**Tous les types de transactions sont couverts ! 🎯**

---

**Date de mise à jour** : 14 novembre 2025, 10:35  
**Version** : 2.0.3  
**Statut** : ✅ Déployé en Production
