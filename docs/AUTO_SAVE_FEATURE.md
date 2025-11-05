# Auto-Save Feature for Invoice Creation

## Overview

The invoice creation page now includes an automatic save feature that prevents data loss when users are filling out forms. This feature saves all form data to localStorage automatically.

## How It Works

### Auto-Save Hook (`useAutoSave.ts`)
- **Debounced Saving**: Waits 3 seconds after the last change before saving
- **Smart Comparison**: Only saves when data actually changes
- **Toast Notifications**: Shows subtle success messages (first save and every 5th save)
- **Error Handling**: Gracefully handles localStorage errors

### Features
1. **Automatic Saving**: Saves all form fields, items, and custom calculations
2. **Draft Restoration**: Automatically restores saved drafts when returning to the page
3. **Visual Indicators**: Shows auto-save status in the header
4. **Draft Management**: Clear draft buttons in header and sidebar
5. **Smart Cleanup**: Automatically removes saved data after successful invoice creation

## User Experience

### Visual Indicators
- **Header**: Shows "Sauvegarde automatique activée" with clock icon
- **Clear Button**: Appears in header and sidebar when draft exists
- **Toast Messages**: Subtle notifications for save confirmation

### Storage Key
- **New Invoices**: `facture_new_draft`
- **Edit Mode**: `facture_edit_{id}` (auto-save disabled in edit mode)

### Saved Data
```typescript
{
  formData: {
    client_id: string,
    type: 'devis' | 'facture',
    mode_livraison: 'aerien' | 'maritime',
    devise: 'USD' | 'CDF',
    date_emission: string,
    statut: string,
    conditions_vente: string,
    notes: string,
    informations_bancaires: string
  },
  items: FactureItem[],
  customFraisPercentage: number | null,
  customTransportFee: number | null
}
```

## Technical Implementation

### Hook Usage
```typescript
const { loadSavedData, clearSavedData, hasSavedData } = useAutoSave({
  data: autoSaveData,
  storageKey: 'facture_new_draft',
  debounceMs: 3000,
  enabled: !isEditMode
});
```

### Key Features
- **Debouncing**: Prevents excessive saves during rapid typing
- **Change Detection**: Uses JSON comparison to avoid unnecessary saves
- **Cleanup**: Automatically clears localStorage after successful creation
- **Error Recovery**: Handles localStorage quota exceeded errors

## Benefits

1. **Data Protection**: Prevents loss from browser crashes, tab closures, or accidental navigation
2. **User Confidence**: Users can fill forms without fear of losing progress
3. **Seamless Experience**: Automatic restoration feels like magic
4. **Performance**: Debounced saves don't impact form responsiveness
5. **Storage Efficient**: Only saves when data actually changes

## Future Enhancements

- **Server-side Sync**: Sync drafts to user account for cross-device access
- **Draft Expiration**: Auto-delete old drafts after 30 days
- **Multiple Drafts**: Allow saving multiple invoice drafts
- **Conflict Resolution**: Handle conflicts between multiple browser tabs
- **Export/Import**: Allow users to export/import drafts

## Browser Compatibility

- **localStorage Required**: Works in all modern browsers
- **Private Mode**: Gracefully handles localStorage disabled in private browsing
- **Storage Limits**: Monitors localStorage quota and provides warnings

## Security Considerations

- **Local Storage Only**: Data never sent to servers until explicit save
- **No Sensitive Data**: Auto-save excludes temporary fields and passwords
- **Automatic Cleanup**: Data removed after successful submission
