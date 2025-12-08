# 📦 Spécifications Fonctionnelles - Gestion des Colis/Parcels

## 🎯 Vue d'Ensemble

La fonctionnalité de gestion des colis permet de suivre les colis des clients depuis la Chine jusqu'à la livraison finale au Congo. Elle s'intègre parfaitement dans l'écosystème FactureX existant avec une gestion séparée pour les livraisons aériennes et maritimes.

---

## 🗂️ Structure de Navigation

### Sidebar avec Sous-Menus
```
📦 COLIS
  ├── ✈️ Colis Aériens
  └── 🚢 Colis Maritimes
```

Chaque sous-menu mène à une page dédiée avec des tableaux et fonctionnalités spécifiques.

---

## 📊 Base de Données

### Table `colis`
```sql
CREATE TABLE colis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  type_livraison 'aerien' | 'maritime' NOT NULL,
  
  -- Informations Fournisseur
  fournisseur VARCHAR(100) NOT NULL, -- 'Alibaba', 'Aliexpress', '1688', 'Autre'
  tracking_chine VARCHAR(200),
  numero_commande VARCHAR(200),
  
  -- Caractéristiques
  poids DECIMAL(10,2) NOT NULL,
  dimensions VARCHAR(100), -- L x l x H (optionnel)
  
  -- Calcul Coûts
  tarif_kg DECIMAL(10,2) NOT NULL, -- 16$, 25$, etc.
  montant_a_payer DECIMAL(10,2) GENERATED ALWAYS AS (poids * tarif_kg) STORED,
  
  -- Gestion Logistique
  transitaire_id UUID REFERENCES transitaires(id),
  agence_depart VARCHAR(100), -- Agence de départ en Chine
  
  -- Dates Importantes
  date_expedition DATE, -- Date d'expédition de Chine
  date_arrivee_agence DATE, -- Arrivée à l'agence (Kinshasa/Lubumbashi, c'est ca meme congo)
  
  
  -- Statuts
  statut 'en_preparation' | 'expedie_chine' | 'en_transit' | 'arrive_congo' | 'recupere_client' | 'livre' DEFAULT 'en_preparation',
  statut_paiement 'non_paye' | 'partiellement_paye' | 'paye' DEFAULT 'non_paye',
  
  -- Informations Supplémentaires
  contenu_description TEXT, -- Description du contenu

  
  -- Métadonnées
  notes TEXT,
  documents JSONB, -- URLs des documents scannés
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table `transitaires`
```sql
CREATE TABLE transitaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(200) NOT NULL,
  nom_contact VARCHAR(100),
  telephone VARCHAR(50),
  ville VARCHAR(100),
  services_offerts TEXT[], -- ['aerien', 'maritime']
  
  -- Spécialisations
  specialisation_chine BOOLEAN DEFAULT false,
  specialisation_congo BOOLEAN DEFAULT false,
  
  -- Performance
  delai_moyen_livraison INTEGER, -- En jours
  tarif_base DECIMAL(10,2),
  
  -- Statut
  actif BOOLEAN DEFAULT true,
  note_interne TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table `tarifs_colis`
```sql
CREATE TABLE tarifs_colis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_livraison 'aerien' | 'maritime' NOT NULL,
  categorie VARCHAR(50) NOT NULL, -- 'Regulier', 'Express'
  poids_min DECIMAL(10,2) DEFAULT 1,
  poids_max DECIMAL(10,2) DEFAULT 100,
  tarif_par_kg DECIMAL(10,2) NOT NULL,
  
  -- Configurations
  devise 'USD' | 'CDF' DEFAULT 'USD', ( Cest deja configuré dans la DB)

  
  description TEXT,
  conditions TEXT, -- Conditions spéciales
  
  actif BOOLEAN DEFAULT true,
  date_debut DATE,
  date_fin DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table `paiements_colis`
```sql
CREATE TABLE paiements_colis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colis_id UUID REFERENCES colis(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  
  -- Détails Paiement
  montant_paye DECIMAL(10,2) NOT NULL,
  devise 'USD' | 'CDF' NOT NULL,
  mode_paiement VARCHAR(50) NOT NULL, -- 'espece', 'mobile_money', 'banque', (deja configuré dans la DB)'autre'
  reference_paiement VARCHAR(200),
  
  -- Dates
  date_paiement DATE NOT NULL,
  
  -- Statut
  statut 'en_attente' | 'confirme' | 'annule' DEFAULT 'en_attente',
  
  -- Informations
  recu_url VARCHAR(500), -- URL du reçu scanné
  notes TEXT,
  
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✈️ Module Colis Aériens

### Tableau Principal - Colonnes
| Colonne | Description | Spécificités Aériennes |
|---------|-------------|------------------------|
| Client | Nom + Téléphone | Recherche rapide |
| N° Colis | ID unique | Format: CA-2025-001 |
| Fournisseur | Alibaba/Aliexpress/1688 | Badge couleur |
| Tracking Chine | N° suivi China Post | Copiable 1-clic |
| Poids | En kg | 2 décimales |
| Tarif/kg | $16/$25/etc | Configurable |
| **Montant** | **Total à payer** | **Calculé automatiquement** |
| Transitaire | Nom du transitaire |
| Statut | Badge couleur | En transit/Arrivé/Livré |
| Date Arrivée Congo | 📅 | Alerte si retard |
| Actions | ✏️📄💰 | Éditer/Facture/Payer |

### Spécificités Aériennes
- **Tarifs standards**: $16/kg (standard), $25/kg (express)
- **Délai moyen**: 7-14 jours
- **Tracking**: China Post, SF Express, etc. ( on va entrer le numero manuellement)

### Workflow Aérien
1. **Préparation** → Saisie infos client + fournisseur
2. **Expédition** → Tracking Chine disponible
3. **En Transit** → Suivi automatique
4. **Arrivée Agence** → Notification client
5. **Arrivée Congo** → Prêt pour retrait
6. **Récupéré** → Statut final

---

## 🚢 Module Colis Maritimes (Prévu)

### Différences Clés avec Aérien
- **Tarifs**: $450/CBM (standard), $650/CBM (express) -  Configurable   
- **Unité**: Volume (CBM) au lieu de poids
- **Délai**: 65-75 jours
- **Container**: Groupage par container

### Tableau Maritime - Colonnes Spécifiques
| Colonne | Description | Spécificités Maritimes |
|---------|-------------|------------------------|
| Volume | En CBM | L × l × H / 1000000 |
| Container | N° Container | Partage container |


---

## 🔧 Fonctionnalités Techniques

### Calcul Automatique des Coûts
```typescript
// Pour colis aériens
montantTotal = poids * tarifKg;

// Pour colis maritimes  
montantTotal = volumeCBM * tarifCBM;
```

### Intégration Clients
- **Historique complet**: Tous les colis d'un client
- **Fiche client**: Onglet "Colis" avec statistiques
- **Notifications**: SMS/Email automatiques

### Gestion des Paiements
- **Lien avec transactions existantes**
- **Facturation automatique**
- **Suivi des règlements**
- **Reçus générés**

### Export & Rapports
- **Excel**: Export par période/client
- **PDF**: Rapport détaillé par colis
- **Statistiques**: Performance transitaires
- **Dashboard**: Widgets colis du jour

---

## 🎨 Interface Utilisateur

### Pages Principales
1. **`/colis/aeriens`** - Tableau colis aériens
2. **`/colis/maritimes`** - Tableau colis maritimes  
3. **`/colis/aeriens/[id]`** - Détails colis aérien
4. **`/colis/maritimes/[id]`** - Détails colis maritime
5. **`/colis/transitaires`** - Gestion transitaires
6. **`/colis/tarifs`** - Configuration tarifs

### Composants Réutilisables
- **ColisCard** - Carte résumé colis
- **StatutBadge** - Badge couleur statut
- **TrackingInput** - Champ tracking avec validation
- **TransitaireSelect** - Sélecteur transitaires
- **TarifCalculator** - Calculateur coûts en temps réel

### Responsive Design
- **Desktop**: Tableau complet avec toutes les colonnes
- **Tablette**: Tableau simplifié + cards
- **Mobile**: Cards détaillées par colis

---

## 📋 Permissions & Sécurité

### Types de Permissions
```typescript
// Niveau lecture
can_read_colis_aeriens
can_read_colis_maritimes
can_read_transitaires

// Niveau écriture  
can_create_colis
can_update_colis
can_delete_colis

// Niveau administration
can_manage_transitaires
can_manage_tarifs
can_export_colis
```

### Règles d'Accès
- **Agents**: Voir/Modifier leurs colis assignés
- **Superviseurs**: Tous les colis + export
- **Admin**: Configuration complète

---

## 🔄 Intégrations Externes

### API Tracking (Futur)
- **China Post**: Tracking automatique
- **SF Express**: Mise à jour statuts
- **17Track**: Agrégateur tracking

### Notifications
- **Email**: Arrivée agence/Congo
- **SMS**: Alerte retrait disponible
- **WhatsApp**: Confirmation livraison

---

## 📊 Statistiques & KPIs

### Indicateurs Principaux
- **Colis en transit**: Nombre et valeur
- **Délai moyen livraison**: Par type/transporteur
- **Taux de récupération**: % colis retirés
- **Chiffre d'affaires colis**: Par période
- **Performance transitaires**: Note/délai

### Widgets Dashboard
- Colis arrivés aujourd'hui
- Montant à encaisser
- Colis en retard
- Top 5 clients du mois

---

## 🚀 Plan de Déploiement

### Phase 1: Base Aérien ✅
- [x] Base de données colis
- [x] CRUD colis aériens  
- [x] Intégration clients
- [x] Calcul frais automatique

### Phase 2: Fonctionnalités Avancées
- [ ] Gestion transitaires
- [ ] Paiements colis
- [ ] Notifications automatiques
- [ ] Export rapports

### Phase 3: Module Maritime
- [ ] Adaptation volume/CBM
- [ ] Gestion containers
- [ ] Documents B/L
- [ ] Spécificités maritimes

### Phase 4: Optimisations
- [ ] API tracking externe
- [ ] Application mobile
- [ ] OCR documents
- [ ] Intelligence artificielle

---

## 🎯 Cas d'Usage

### Scénario Type - Colis Aérien
1. **Client appelle**: "J'ai un colis Alibaba qui arrive"
2. **Agent crée colis**: Saisit tracking + poids
3. **Système calcule**: 2.5kg × $16 = $40
4. **Notification automatique**: SMS quand colis arrive
5. **Client paie**: $40 en agence ou mobile money
6. **Statut mis à jour**: "Payé et récupéré"

### Scénario Type - Colis Maritime  
1. **Client achète**: Container partagé 1688
2. **Agent enregistre**: Volume 0.8 CBM
3. **Calcul automatique**: 0.8 CBM × $450 = $360
4. **Suivi container**: Mise à jour hebdomadaire
5. **Arrivée port**: Notification douane
6. **Livraison finale**: Transport dernier kilomètre

---

## 📝 Notes Techniques

### Performance
- **Indexation**: Sur client_id, statut, dates
- **Pagination**: 50 colis par page
- **Cache**: Transitaires et tarifs en cache

### Backup & Sécurité
- **Sauvegarde**: Quotidienne automatique
- **Audit**: Log toutes les modifications
- **RGPD**: Données clients protégées

### Évolutivité
- **Multi-agences**: Prévu pour expansion
- **API REST**: Pour intégrations futures
- **Microservices**: Architecture modulaire

---

## ✅ Validation Acceptance

### Critères de Validation
- [ ] CRUD colis fonctionnel
- [ ] Calcul frais automatique correct
- [ ] Intégration clients parfaite
- [ ] Export Excel disponible
- [ ] Notifications envoyées
- [ ] Mobile responsive
- [ ] Permissions respectées
- [ ] Performance acceptable (<2s)

### Tests à Réaliser
1. **Création colis**: Formulaire complet
2. **Calcul tarifs**: Différents poids/tarifs
3. **Changement statut**: Workflow complet
4. **Paiement**: Lien avec transactions
5. **Export**: Fichiers générés
6. **Mobile**: Responsive design

---

**Document préparé par :** Cascade AI Assistant  
**Date :** 29 Octobre 2025  
**Version :** 1.0  
**Projet :** FactureX - Module Colis/PARCEL
