# Templates d'emails FactureX

Ce dossier contient les templates HTML pour les emails transactionnels de FactureX.

## Templates disponibles

### 1. **confirmation.html** - Email de confirmation
Envoyé lors de l'inscription d'un nouvel utilisateur pour confirmer son adresse email.

**Variables :**
- `{{ .Name }}` - Nom de l'utilisateur
- `{{ .ConfirmationURL }}` - Lien de confirmation

---

### 2. **invitation.html** - Email d'invitation
Envoyé pour inviter un nouvel utilisateur à rejoindre la plateforme.

**Variables :**
- `{{ .Name }}` - Nom de l'utilisateur invité
- `{{ .InvitationURL }}` - Lien d'acceptation de l'invitation

---

### 3. **reset-password.html** - Email de réinitialisation de mot de passe
Envoyé lorsqu'un utilisateur demande à réinitialiser son mot de passe.

**Variables :**
- `{{ .Name }}` - Nom de l'utilisateur
- `{{ .ConfirmationURL }}` - Lien de réinitialisation

---

## Configuration dans Supabase

Pour utiliser ces templates dans votre projet Supabase :

1. Accédez à votre projet Supabase Dashboard
2. Allez dans **Authentication** > **Email Templates**
3. Pour chaque type d'email (Confirm signup, Invite user, Reset password) :
   - Copiez le contenu HTML du template correspondant
   - Collez-le dans l'éditeur de template
   - Assurez-vous que les variables Supabase correspondent :
     - `{{ .Name }}` ou `{{ .Email }}`
     - `{{ .ConfirmationURL }}` ou `{{ .InvitationURL }}`

## Design

Les templates utilisent :
- **Design moderne et épuré** avec des dégradés violets (#667eea → #764ba2)
- **Responsive** - s'adapte aux mobiles et tablettes
- **Accessibilité** - utilisation de tables pour la compatibilité email
- **Personnalisation** - inclusion du nom de l'utilisateur
- **CTA clair** - boutons d'action bien visibles
- **Sécurité** - messages d'avertissement appropriés

## Personnalisation

Pour modifier les couleurs du gradient, changez les valeurs dans :
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Pour modifier le nom de l'application, remplacez "FactureX" dans les templates.
