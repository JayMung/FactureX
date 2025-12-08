# Guide de Sécurité Financière - FactureX

## 🛡️ Contraintes Actives

### Transactions
- **Montant** : 0.01 à 999,999,999.99 USD
- **Frais** : Doivent être <= montant (pas de frais supérieurs au montant)
- **Devise** : Uniquement USD ou CDF
- **Type** : revenue, depense, transfert
- **Taux de change** : Positifs et valides

### Comptes Financiers
- **Solde** : Non-négatif, maximum 100,000,000 USD
- **Type** : mobile_money, banque, cash
- **Nom** : Non-vide, maximum 100 caractères
- **Numéro compte** : Format flexible (vide autorisé)

### Paiements
- **Montant** : Minimum 1 USD, maximum 999,999,999.99 USD
- **Type** : facture, colis uniquement

### Mouvements Comptes
- **Montant** : Positif, maximum 999,999,999.99 USD
- **Type** : debit, credit
- **Cohérence** : solde_apres = solde_avant ± montant

### Clients
- **Nom** : Non-vide, maximum 100 caractères
- **Téléphone** : 10-20 caractères si fourni
- **Total payé** : Non-négatif

### Factures
- **Total général** : Positif, maximum 999,999,999.99 USD
- **Statut paiement** : payee, impayee, partiellement_payee, non_paye

---

## 🚨 Procédure d'Urgence

### Si une contrainte bloque une opération légitime :

1. **Vérifier les logs dans `financial_audit_logs`**
   ```sql
   SELECT * FROM financial_audit_logs 
   WHERE table_name = 'transactions' 
     AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

2. **Contacter un super-admin**
   - Email : mungedijeancy@gmail.com
   - Vérifier les permissions dans `auth.users`

3. **Utiliser le script rollback si nécessaire**
   ```bash
   # Appliquer le script de rollback
   npm run db:rollback financial_validation_constraints
   ```

4. **Analyser la cause racine**
   - Est-ce une donnée invalide ?
   - Est-ce une contrainte trop restrictive ?
   - Est-ce une tentative d'attaque ?

---

## 🔄 Workflow d'Approbation

### Seuils Automatiques
- **< 1000$** : Auto-validation immédiate
- **1000-5000$** : 1 admin requis
- **> 5000$** : 2 admins requis

### Règles de Sécurité
- Un admin ne peut pas approuver sa propre transaction
- Le même admin ne peut pas donner 2 approbations
- Les approbations sont immuables (non modifiables)
- Toute modification après approbation réinitialise le workflow

### Notifications
- **Création** : Email au créateur
- **Approbation requise** : Email aux admins concernés
- **Approbation complète** : Email au créateur
- **Rejet** : Email au créateur avec motif

---

## 📊 Rapports Financiers Sécurisés

### Types de Rapports
1. **Cash Flow** : Entrées/sorties avec projection 30 jours
2. **Profitability** : Bénéfice par client (top 10) et par type
3. **Discrepancies** : Écarts > 1% entre calculs et enregistrements

### Sécurité des Rapports
- **Watermark dynamique** : "Généré par [email] le [date] - FactureX"
- **Checksum SHA256** : Intégrité vérifiable
- **Isolation stricte** : Une organisation ne voit que ses données
- **Expiration** : Rapports expirent après 7 jours

### Performance
- **< 10K transactions** : < 10 secondes
- **10K-100K transactions** : < 30 secondes
- **> 100K transactions** : Génération asynchrone

---

## 💱 Gestion Multi-Devise

### Taux de Change
- **Source** : Banque Centrale du Congo
- **Fréquence** : Quotidienne à 00:00 UTC
- **Rétention** : Historique complet immuable
- **Validation** : Impossible de modifier un taux > 24h

### Conversions
- **Précision** : 4 décimales internes, 2 décimales affichées
- **Cache** : Redis avec TTL 5 minutes
- **Audit** : Toutes les conversions loggées

### Devises Supportées
- **USD** : Devise principale
- **CDF** : Devise locale
- **CNY** : Devise intermédiaire (non modifiable)

---

## 📎 Upload de Documents

### Limites
- **Taille fichier** : Maximum 5MB par fichier
- **Nombre fichiers** : Maximum 10 par transaction
- **Types autorisés** : PDF, JPG, PNG, DOC, DOCX

### Sécurité
- **Pre-signed URL** : Valide 5 minutes uniquement
- **Checksum MD5** : Vérification intégrité
- **Isolation** : Stockage par organisation
- **Suppression sécurisée** : Suppression définitive

### Types de Documents
- **proof_of_service** : Preuve de service
- **client_signature** : Signature client
- **receipt** : Reçu de paiement
- **contract** : Contrat signé

---

## 🔍 Monitoring et Alertes

### Alertes Critiques
- **Tentative d'accès cross-organization** : Immédiat
- **Transaction > 10,000$** : Immédiat
- **Suppression de données financières** : Immédiat
- **Échec validation > 10x/heure** : Toutes les heures

### Métriques à Surveiller
- **Temps de génération des rapports**
- **Nombre d'approbations en attente**
- **Taux d'échec des validations**
- **Utilisation du storage**

### Dashboard Sécurité
- **Route** : `/security-dashboard`
- **Accès** : Admins uniquement
- **Fonctionnalités** : Logs, alertes, audit trail

---

## 🛠️ Scripts d'Urgence

### Rollback Contraintes
```sql
-- Désactiver toutes les contraintes de validation
\i supabase/migrations/20250111_create_financial_validation_constraints_rollback.sql
```

### Reset Workflow
```sql
-- Réinitialiser toutes les approbations en attente
UPDATE transaction_approvals 
SET status = 'cancelled', updated_at = NOW()
WHERE status = 'pending';
```

### Backup Rapide
```bash
# Exporter les données financières critiques
pg_dump -h localhost -U postgres -d facturex \
  -t transactions -t paiements -t comptes_financiers \
  -t mouvements_comptes -t financial_audit_logs \
  > financial_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📞 Contact d'Urgence

### Équipe Sécurité
- **Admin principal** : mungedijeancy@gmail.com
- **Développeur** : Via GitHub Issues
- **Support Supabase** : Via console Supabase

### Procédures d'Escalade
1. **Niveau 1** : Admin local
2. **Niveau 2** : Super admin
3. **Niveau 3** : Équipe de développement
4. **Niveau 4** : Support externe (Supabase, AWS)

---

*Ce guide doit être consulté en cas d'urgence ou de doute sur la sécurité financière.*
