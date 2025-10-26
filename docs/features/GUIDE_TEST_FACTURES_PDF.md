# Guide de Test - Générateur de Factures PDF

## 🎯 Objectif

Ce guide vous explique comment tester le nouveau générateur de factures PDF basé sur le template COCCINELLE.

## 📝 Fichiers créés

1. **src/utils/factureTemplate.ts** - Template HTML professionnel
2. **src/utils/pdfGeneratorHTML.ts** - Générateur de PDF
3. **facture-example.html** - Exemple standalone pour test rapide
4. **FACTURE_PDF_README.md** - Documentation complète

## 🧪 Test rapide avec l'exemple standalone

### Étape 1 : Ouvrir l'exemple
1. Ouvrez le fichier `facture-example.html` dans votre navigateur
2. Vous verrez un rendu de facture professionnel avec le style COCCINELLE

### Étape 2 : Tester l'impression
1. Cliquez sur le bouton "Imprimer / Sauvegarder en PDF"
2. Une boîte de dialogue d'impression s'ouvrira
3. Choisissez "Enregistrer au format PDF" comme destination
4. Sauvegardez le fichier pour vérifier le rendu final

### Étape 3 : Vérifier le rendu
Assurez-vous que :
- ✅ L'en-tête affiche correctement les informations de COCCINELLE
- ✅ Les couleurs (vert émeraude) sont bien visibles
- ✅ Le tableau des articles est bien formaté
- ✅ Les totaux sont correctement calculés
- ✅ Les informations bancaires sont en bas de page

## 🚀 Test dans l'application CoxiPay

### Prérequis
Assurez-vous que :
- Le serveur de développement est lancé (`npm run dev`)
- Vous êtes connecté à l'application
- Vous avez accès au module "Factures"
- Une facture existe déjà ou vous pouvez en créer une

### Étape 1 : Créer ou modifier une facture

1. Naviguez vers `/factures`
2. Soit :
   - Cliquez sur "Nouvelle Facture" pour en créer une
   - Ou cliquez sur "Modifier" pour une facture existante

### Étape 2 : Remplir les informations

**Données minimales requises :**
- Client : Sélectionnez un client existant
- Type : Devis ou Facture
- Mode de livraison : Aérien ou Maritime
- Devise : USD ou CDF
- Au moins un article avec :
  - Description
  - Quantité
  - Prix unitaire
  - Poids

**Exemple de données de test :**
```
Client: Test Client
Type: Facture
Mode: Maritime
Devise: USD

Article 1:
- Description: Tuiles de toit en métal - Rouge 0.5mm
- Quantité: 700
- Prix unitaire: 2.43
- Poids: 2.10
```

### Étape 3 : Sauvegarder la facture

1. Cliquez sur "Créer" ou "Mettre à jour"
2. Attendez la confirmation de succès

### Étape 4 : Générer le PDF

1. Cliquez sur le bouton "Générer PDF"
2. Une nouvelle fenêtre devrait s'ouvrir avec l'aperçu
3. Si les popups sont bloquées :
   - Autorisez les popups pour localhost
   - Réessayez

### Étape 5 : Imprimer/Sauvegarder

1. Dans la nouvelle fenêtre, l'impression devrait se lancer automatiquement
2. Si ce n'est pas le cas, appuyez sur `Ctrl+P` (Windows) ou `Cmd+P` (Mac)
3. Choisissez "Enregistrer au format PDF"
4. Vérifiez le fichier généré

## 🔍 Points de vérification

### Contenu de la facture
- [ ] Numéro de facture correct
- [ ] Date d'émission correcte
- [ ] Informations client complètes
- [ ] Mode de livraison correct
- [ ] Tous les articles listés
- [ ] Images des produits (si disponibles)
- [ ] Quantités correctes
- [ ] Prix unitaires corrects
- [ ] Montants totaux calculés correctement

### Calculs
- [ ] Sous-total = somme des montants des articles
- [ ] Frais = pourcentage du sous-total (15% par défaut)
- [ ] Transport & Douane = poids × tarif selon mode
- [ ] Total général = sous-total + frais + transport

### Présentation
- [ ] En-tête professionnel avec logo COCCINELLE
- [ ] Couleurs bien rendues (vert émeraude)
- [ ] Texte lisible et bien formaté
- [ ] Tableau bien aligné
- [ ] Pas de débordement de texte
- [ ] Informations bancaires visibles

### Impression
- [ ] Format A4 respecté
- [ ] Marges appropriées
- [ ] Couleurs préservées
- [ ] Pas d'éléments coupés
- [ ] Pas de pages blanches inutiles

## 🐛 Dépannage courant

### Problème : La fenêtre ne s'ouvre pas
**Solution :**
- Vérifiez que les popups ne sont pas bloquées
- Dans Chrome : Cliquez sur l'icône de popup dans la barre d'adresse
- Autorisez les popups pour localhost

### Problème : Les couleurs ne s'affichent pas à l'impression
**Solution :**
- Dans la boîte de dialogue d'impression
- Cochez "Graphiques d'arrière-plan" ou "Background graphics"
- Chrome : Plus de paramètres → Options → Graphiques d'arrière-plan

### Problème : Les images ne s'affichent pas
**Solution :**
- Vérifiez que les URLs des images sont valides
- Vérifiez que les images sont accessibles publiquement
- Testez les URLs dans un nouvel onglet

### Problème : Le calcul des totaux est incorrect
**Solution :**
- Vérifiez les paramètres de frais dans la base de données
- Table `settings`, catégorie `shipping`
- Clés : `frais_aerien_par_kg` et `frais_maritime_par_cbm`

### Problème : TypeScript errors
**Solution :**
```bash
# Recompiler le projet
npm run build

# Ou redémarrer le serveur de développement
npm run dev
```

## 📊 Scénarios de test recommandés

### Scénario 1 : Facture simple (Aérien, USD)
- 1 article
- Mode aérien
- Devise USD
- Vérifier le calcul en kg

### Scénario 2 : Facture complexe (Maritime, CDF)
- Plusieurs articles (5+)
- Mode maritime
- Devise CDF
- Vérifier le calcul en cbm

### Scénario 3 : Devis avec images
- Type : Devis
- Articles avec URLs d'images valides
- Vérifier l'affichage des images

### Scénario 4 : Facture avec conditions personnalisées
- Ajouter des conditions de vente spécifiques
- Ajouter des notes
- Vérifier qu'elles apparaissent dans le PDF

## 📈 Tests de performance

### Test 1 : Facture avec beaucoup d'articles
- Créer une facture avec 20-30 articles
- Vérifier que la génération reste rapide (<2 secondes)
- Vérifier que la pagination fonctionne si nécessaire

### Test 2 : Génération multiple
- Générer 10 factures successivement
- Vérifier qu'il n'y a pas de fuite mémoire
- Vérifier que chaque facture est unique

## ✅ Checklist finale

Avant de déployer en production :

- [ ] Tous les tests unitaires passent
- [ ] Les informations de l'entreprise sont correctes
- [ ] Les tarifs de livraison sont configurés
- [ ] Le calcul des frais est correct
- [ ] L'impression fonctionne sur Chrome, Firefox, Safari
- [ ] Les popups sont gérées correctement
- [ ] Les erreurs sont loguées correctement
- [ ] La documentation est à jour
- [ ] Les utilisateurs finaux ont été formés

## 📞 Support

Si vous rencontrez des problèmes :
1. Consultez d'abord le fichier `FACTURE_PDF_README.md`
2. Vérifiez les logs de la console navigateur
3. Vérifiez les erreurs dans Supabase
4. Contactez l'équipe de développement

## 🎉 Félicitations !

Si tous les tests passent, votre système de génération de factures PDF est prêt à être utilisé !
