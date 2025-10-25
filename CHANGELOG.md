# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.2] - 2025-10-25

### ✨ Nouvelles fonctionnalités

#### Interface utilisateur
- **Nom de client cliquable** : Le nom du client dans la liste est maintenant cliquable et ouvre l'historique
- **Header informatif modal client** : Ajout d'une carte d'informations avec nom, téléphone et ville
- **Design modernisé** : Cartes de statistiques avec bordures colorées, icônes dans des cercles et effets hover
- **Formatage des noms** : Les noms de clients s'affichent en format "Jean Pierre" (capitalize)
- **Position header** : Nom d'utilisateur à gauche, photo de profil à droite

#### Paramètres
- **Section Profil améliorée** :
  - Photo de profil avec bouton de modification
  - Affichage de l'email (lecture seule)
  - Gestion du mot de passe avec champs sécurisés
  - Numéro de téléphone modifiable
  - Date d'inscription
- **Sidebar sticky** : La navigation des paramètres reste fixe lors du scroll
- **Ordre des onglets** : Factures placé après Moyens de paiement
- **Logs d'activité** : Affichage en tableau avec détails simplifiés et lisibles

#### Notifications
- **Système amélioré** : Le compteur se met à jour correctement lors de la lecture
- **Bouton "Tout marquer comme lu"** : Permet de marquer toutes les notifications d'un coup

### 🐛 Corrections de bugs

#### Formulaires
- **Édition client** : Le formulaire charge maintenant correctement les données du client
- **Toasts dupliqués** : Suppression des notifications en triple lors de la mise à jour
- **Enregistrement noms** : Les noms sont enregistrés en minuscules dans la base de données

#### Modal
- **Fermeture accidentelle** : Le modal historique client ne se ferme plus au clic extérieur
- **Bouton close dupliqué** : Suppression du bouton X en double
- **Date invalide** : Correction de l'affichage "Invalid Date" dans les logs

#### Divers
- **Icônes uniques** : Correction de l'erreur "duplicate keys" avec des icônes différentes
- **Lien admin-setup** : Suppression du lien public sur la page de login

### 🎨 Améliorations de design

#### Cartes de statistiques
- Bordures gauche colorées (4px)
- Icônes dans des cercles avec fond pastel
- Effet hover avec ombre portée
- Texte plus grand (text-3xl)
- Labels uppercase avec tracking-wide
- Grid responsive (1/2/4 colonnes)

#### Logs d'activité
- Tableau structuré et minimaliste
- Colonnes : Action, Cible, Utilisateur, Date, Détails
- Détails simplifiés et compréhensibles
- Format de date français (JJ/MM/AAAA HH:MM)

#### Modal historique client
- Header avec gradient vert-bleu
- Informations client avec icônes colorées
- Nom formaté en capitalize partout
- Design cohérent et moderne

### 📝 Modifications techniques

#### Base de données
- Les noms de clients sont stockés en minuscules
- Affichage formaté avec capitalize à l'interface

#### Composants
- Ajout de `useEffect` dans `ClientForm` pour charger les données
- Suppression des toasts dupliqués dans les hooks
- Amélioration de la gestion des états

### 🔒 Sécurité
- Lien admin-setup retiré de la page publique de login
- Accès direct via URL uniquement

---

## [1.0.1] - Version précédente

### Fonctionnalités initiales
- Gestion des clients
- Gestion des factures et devis
- Gestion des transactions
- Système de permissions
- Logs d'activité
- Notifications en temps réel

---

## Format

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).
