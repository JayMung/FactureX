# FactureX

**Version** : 1.0.3  
**Status** : ✅ Production Ready

Application de gestion de factures, clients, transactions et colis pour entreprises.

---

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

---

## 📚 Documentation

Toute la documentation technique se trouve dans le dossier `/docs` :

### Guides Principaux
- [Release Notes v1.0.3](docs/RELEASE_NOTES_v1.0.3.md)
- [Release Deployment](docs/RELEASE_v1.0.3_DEPLOYED.md)
- [Finances Permissions Guide](docs/FINANCES_PERMISSIONS_GUIDE.md)

### Documentation Technique
- [TypeScript Resolution](docs/TYPESCRIPT_FINAL_FIX.md)
- [UI Types Solution](docs/UI_TYPES_SOLUTION.md)
- [Security Audit](docs/RAPPORT_AUDIT_SECURITE_FACTUREX.md)

### Fixes & Improvements
- Voir le dossier `/docs/fixes/` pour les corrections spécifiques
- Voir le dossier `/docs/guides/` pour les guides détaillés

---

## 🔧 Technologies

- **Frontend** : React + TypeScript + Vite
- **UI** : TailwindCSS + shadcn/ui
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **State Management** : React Query
- **Routing** : React Router v6

---

## 🔒 Security

- Multi-tenancy avec isolation par organization
- Row Level Security (RLS) sur toutes les tables
- Permissions granulaires par module
- Session management sécurisé
- Rate limiting sur les endpoints critiques

---

## 📦 Modules

- **Clients** : Gestion des clients
- **Factures** : Création et gestion de factures/devis
- **Transactions** : Transactions commerciales
- **Colis** : Gestion des colis aériens
- **Finances** : Module sécurisé (Admin uniquement)
  - Opérations financières
  - Comptes financiers
  - Mouvements de comptes
  - Encaissements

---

## 👥 Roles & Permissions

- **Super Admin** : Accès complet
- **Admin** : Gestion complète sauf configuration système
- **Opérateur** : Accès limité (pas de finances)
- **Comptable** : Lecture seule sur finances (optionnel)

---

## 🚀 Deployment

L'application est configurée pour un déploiement automatique sur :
- **Vercel** (recommandé)
- **Netlify**

Le déploiement se déclenche automatiquement sur push vers `main`.

---

## 📝 License

Propriétaire - Tous droits réservés

---

## 🤝 Support

Pour toute question ou problème, consultez la documentation dans `/docs` ou contactez l'équipe de développement.

---

**FactureX v1.0.3** - Gestion d'entreprise simplifiée ✨
