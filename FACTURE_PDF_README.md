# Générateur de Factures PDF - COCCINELLE

Ce document explique le nouveau système de génération de factures PDF pour CoxiPay, basé sur le template COCCINELLE.

## 📋 Fichiers créés

### 1. `src/utils/factureTemplate.ts`
Template HTML professionnel pour la génération des factures. Ce fichier contient :
- La structure HTML complète de la facture
- Les styles Tailwind CSS pour un rendu professionnel
- Les informations de l'entreprise COCCINELLE
- Le formatage automatique des données

**Caractéristiques principales :**
- Design responsive et professionnel
- En-tête avec logo et informations de l'entreprise
- Section client et livraison
- Tableau détaillé des articles avec images
- Récapitulatif des coûts avec sous-total, frais et total général
- Conditions de vente et informations bancaires
- Support des deux devises (USD et CDF)
- Support des deux modes de livraison (aérien et maritime)

### 2. `src/utils/pdfGeneratorHTML.ts`
Générateur de PDF utilisant le template HTML. Ce fichier propose deux fonctions :

#### `generateFacturePDFHTML(facture: Facture)`
Génère et ouvre la facture dans une nouvelle fenêtre pour impression directe.
- Récupère automatiquement les données de la facture depuis Supabase
- Calcule les totaux
- Ouvre une fenêtre d'impression avec le rendu final

#### `downloadFacturePDFHTML(facture: Facture)`
Télécharge la facture au format HTML pour consultation ou conversion ultérieure.
- Génère un fichier HTML autonome
- Peut être ouvert dans n'importe quel navigateur
- Facilite la conversion en PDF via le navigateur

## 🎨 Personnalisation

### Modifier les informations de l'entreprise
Éditez le fichier `src/utils/factureTemplate.ts` :

```typescript
const COMPANY_INFO = {
  name: '@COCCINELLE',
  addresses: [
    '44, Kokolo, Q/Mbinza Pigeon, C/Ngaliema - Kinshasa',
    '45, Avenue Nyangwe - Elie Mbayo, Q/Lido, C/Lubumbashi'
  ],
  phones: '(+243) 970 746 213 / (+243) 851 958 937',
  email: 'sales@coccinelledrc.com',
  website: 'www.coccinelledrc.com',
  // ... autres informations
};
```

### Modifier le pourcentage des frais
Éditez le fichier `src/utils/pdfGeneratorHTML.ts` :

```typescript
const fraisPercentage = 15; // Changez cette valeur selon vos besoins
```

### Personnaliser les styles
Le template utilise Tailwind CSS. Vous pouvez modifier les classes dans `factureTemplate.ts` :
- `bg-emerald-600` : Couleur principale (vert émeraude)
- `text-gray-700` : Couleur du texte
- Etc.

## 🚀 Utilisation

### Dans le code
```typescript
import { generateFacturePDFHTML } from '@/utils/pdfGeneratorHTML';

// Pour imprimer directement
await generateFacturePDFHTML(facture);

// Pour télécharger en HTML
await downloadFacturePDFHTML(facture);
```

### Depuis l'interface
1. Accédez à la page de création/modification de facture
2. Cliquez sur le bouton "Générer PDF"
3. Une nouvelle fenêtre s'ouvre avec l'aperçu
4. Utilisez Ctrl+P (ou Cmd+P sur Mac) pour imprimer ou sauvegarder en PDF

## 📊 Structure des données

Le générateur attend une structure de données complète incluant :

```typescript
interface TemplateData {
  facture: Facture;        // Données de la facture
  client: Client;          // Informations du client
  items: FactureItem[];    // Liste des articles
  totals: {
    subtotal: number;
    frais: number;
    fraisTransportDouane: number;
    totalGeneral: number;
  };
}
```

## 🎯 Avantages de cette approche

1. **Rendu professionnel** : Utilise HTML/CSS moderne pour un design impeccable
2. **Facilement personnalisable** : Modifier le template HTML est plus simple que jsPDF
3. **Responsive** : S'adapte à différentes tailles d'écran
4. **Images supportées** : Les images de produits sont affichées correctement
5. **Impression native** : Utilise les capacités d'impression du navigateur
6. **SEO-friendly** : Le HTML généré est sémantique et accessible

## 🔧 Dépannage

### Les popups sont bloquées
Si le navigateur bloque la fenêtre d'impression :
1. Autorisez les popups pour votre application
2. Ou utilisez `downloadFacturePDFHTML` pour télécharger le HTML

### Les images ne s'affichent pas
Vérifiez que :
- Les URLs des images sont accessibles publiquement
- Les images ont les bons en-têtes CORS
- Les URLs ne nécessitent pas d'authentification

### Le style n'apparaît pas à l'impression
- Vérifiez que Tailwind CDN est bien chargé
- Attendez quelques secondes avant d'imprimer (le script attend 500ms)
- Assurez-vous que les styles d'impression sont activés dans votre navigateur

## 📝 Notes techniques

- Le template utilise Tailwind CSS via CDN pour une simplicité maximale
- Les polices Google Fonts (Inter) sont chargées pour un rendu professionnel
- Le format A4 est utilisé par défaut pour l'impression
- Les couleurs sont préservées à l'impression grâce à `print-color-adjust: exact`

## 🔄 Migration depuis l'ancien générateur

L'ancien générateur (`pdfGenerator.ts`) est toujours disponible. Pour revenir à l'ancien système :

```typescript
// Dans Factures-Create.tsx ou FactureForm.tsx
import { generateFacturePDF } from '@/utils/pdfGenerator';

// Remplacer
await generateFacturePDFHTML(currentFacture);

// Par
await generateFacturePDF(factureWithItems);
```

## 🎨 Captures d'écran du résultat

Le PDF généré comprend :
- ✅ En-tête professionnel avec informations de l'entreprise
- ✅ Numéro et date de facture
- ✅ Informations client et livraison
- ✅ Tableau détaillé des articles avec images
- ✅ Calcul automatique des totaux
- ✅ Conditions de vente et délais de livraison
- ✅ Informations bancaires et légales
- ✅ Support multidevises (USD/CDF)
- ✅ Support multimodal (Aérien/Maritime)

## 📞 Support

Pour toute question ou problème, consultez la documentation dans le code ou contactez l'équipe de développement.
