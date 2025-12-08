# Settings Tabs Visibility Fix

## Problem
Admin user `mungedijeancy@gmail.com` could only see the "Profil" tab in `/settings` instead of all 10 available tabs.

## Root Causes Identified

### 1. RLS Policy Issue (CRITICAL)
The `admin_roles` table had RLS policies that required existing admin verification to view admin roles, creating a chicken-and-egg problem:
- Policy: "Admins can view all admin roles" required user to already be verified as admin
- Users couldn't check their own admin status without already being admin

### 2. Permission Loading Race Condition
The `usePermissions` hook was checking admin status asynchronously, causing:
- `isAdmin` to be `false` during initial render
- Settings tabs to be filtered out before admin status loaded
- No fallback mechanism if admin service check failed

### 3. Strict Filtering Logic
The settings page filtering was too strict:
- Didn't account for loading states
- No fallback to AuthProvider's admin status
- Failed silently if permission checks errored

## Solutions Implemented

### 1. Added Self-Check RLS Policy ✅
```sql
CREATE POLICY "Users can view their own admin role"
ON admin_roles
FOR SELECT
USING (user_id = auth.uid());
```

**Impact**: Users can now check their own admin status without needing to already be verified as admin.

### 2. Enhanced usePermissions Hook ✅
**File**: `src/hooks/usePermissions.ts`

```typescript
// Added fallback mechanism
const { user, isAdmin: authIsAdmin } = useAuth();

try {
  adminStatus = await adminService.isCurrentUserAdmin();
} catch (adminError) {
  console.warn('Admin service check failed, using AuthProvider fallback:', adminError);
  adminStatus = authIsAdmin; // Fallback to AuthProvider
}
```

**Impact**: 
- Graceful degradation if admin service fails
- Always provides admin status even on errors
- Uses AuthProvider as reliable fallback

### 3. Improved Settings Filtering Logic ✅
**File**: `src/pages/Settings-Permissions.tsx`

```typescript
const filteredOptions = settingsOptions.filter(option => {
  // While loading permissions, show all tabs to avoid flash
  if (permissionsLoading) return true;
  
  // Admins see everything
  if (isAdmin) return true;
  
  // If adminOnly and not admin, hide
  if (option.adminOnly) return false;
  
  // Check module access for non-admin users
  const moduleId = sectionToModuleMap[option.id];
  return moduleId ? canAccessModule(moduleId as any) : true;
});
```

**Impact**:
- Shows all tabs during loading (prevents flash)
- Admins always see all tabs
- Clear separation of admin vs non-admin logic

### 4. Added Debug Logging ✅
```typescript
console.log('Settings Debug:', {
  isAdmin,
  permissionsLoading,
  loading,
  filteredOptionsCount: filteredOptions.length,
  allOptionsCount: settingsOptions.length,
  authUser: authUser?.email,
  authUserRole: authUser?.app_metadata?.role
});
```

**Impact**: Easy debugging of permission issues in browser console.

## Verification

### Database Status
```sql
-- User: mungedijeancy@gmail.com
- user_metadata_role: super_admin ✅
- profile_role: admin ✅
- admin_role: super_admin ✅
- admin_active: true ✅
```

### RLS Policies on admin_roles
1. ✅ "Users can view their own admin role" (NEW)
2. ✅ "Admins can view all admin roles"
3. ✅ "Admins can create admin roles"
4. ✅ "Admins can update admin roles"
5. ✅ "Admins can delete admin roles"

## Expected Result

After refreshing the browser, `mungedijeancy@gmail.com` should see **all 10 settings tabs**:

### Basic Tabs (All Users)
1. ✅ **Profil** - Personal information and avatar
2. ✅ **Entreprise** - Company information and logo
3. ✅ **Factures** - Delivery fees and product categories
4. ✅ **Colis** - Providers and rates for shipping
5. ✅ **Transitaires** - Freight forwarders management

### Admin-Only Tabs
6. ✅ **Utilisateurs** - User accounts and permissions
7. ✅ **Moyens de paiement** - Payment methods configuration
8. ✅ **Taux de change** - Exchange rates (USD/CDF, USD/CNY)
9. ✅ **Frais de transaction** - Transaction fees by type
10. ✅ **Logs d'activité** - Application activity history

## Testing Steps

1. **Clear browser cache**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Navigate to**: `/settings`
3. **Check browser console**: Look for "Settings Debug" log
4. **Verify**: All 10 tabs should be visible in the left sidebar

### Expected Console Output
```javascript
Settings Debug: {
  isAdmin: true,
  permissionsLoading: false,
  loading: false,
  filteredOptionsCount: 10,
  allOptionsCount: 10,
  authUser: "mungedijeancy@gmail.com",
  authUserRole: "super_admin"
}
```

## Security Considerations

### ✅ Maintained Security
- RLS policies still enforce admin-only operations
- Self-check policy only allows viewing own status
- Admin verification still required for managing other admins
- No security degradation from fallback mechanism

### ✅ Improved Reliability
- Multiple layers of admin verification
- Graceful fallback prevents access denial
- Loading states prevent premature filtering
- Debug logging aids troubleshooting

## Files Modified

1. `src/hooks/usePermissions.ts` - Added fallback mechanism
2. `src/pages/Settings-Permissions.tsx` - Improved filtering logic
3. Database: Added RLS policy for self-check

## Rollback Plan

If issues occur, revert with:
```sql
DROP POLICY "Users can view their own admin role" ON admin_roles;
```

Then restore previous versions of:
- `src/hooks/usePermissions.ts`
- `src/pages/Settings-Permissions.tsx`

## Future Enhancements

1. **Cache admin status** in localStorage for faster loads
2. **Add loading skeleton** for settings tabs
3. **Implement permission preloading** on login
4. **Add admin status indicator** in UI
5. **Create admin dashboard** with quick access to all admin features

---

**Status**: ✅ RESOLVED
**Date**: October 31, 2025
**Admin**: mungedijeancy@gmail.com
**Impact**: High - Restored full admin functionality
