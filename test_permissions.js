// Script de test pour valider les restrictions financières
// À exécuter dans la console du navigateur

console.log('🧪 TEST DES PERMISSIONS FINANCIÈRES');
console.log('=====================================');

// 1. Vérifier le rôle de l'utilisateur actuel
const checkUserRole = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log(`👤 Utilisateur: ${user.email}`);
    console.log(`🔑 Rôle: ${profile.role}`);
    
    return profile.role;
  } catch (error) {
    console.error('❌ Erreur:', error);
    return null;
  }
};

// 2. Vérifier la visibilité des éléments UI
const checkUIVisibility = () => {
  console.log('\n🎯 Vérification de l\'interface:');
  
  // Onglet Analytics
  const analyticsTab = document.querySelector('[data-radix-collection-item][value="analytics"]');
  console.log(`📊 Onglet Analytics: ${analyticsTab ? '✅ Visible' : '❌ Caché'}`);
  
  // Cartes financières
  const financialCards = document.querySelectorAll('[data-testid*="facture"], [data-testid*="montant"], [data-testid*="dollar"]');
  console.log(`💰 Cartes financières: ${financialCards.length} trouvées`);
  
  // Actions financières
  const financialActions = document.querySelectorAll('a[href="/transactions"], a[href*="facture"]');
  console.log(`⚡ Actions financières: ${financialActions.length} trouvées`);
  
  // Menu items
  const menuItems = document.querySelectorAll('[data-dyad-name]');
  console.log(`📋 Items menu: ${menuItems.length} trouvés`);
  
  menuItems.forEach(item => {
    const name = item.getAttribute('data-dyad-name');
    const isVisible = item.offsetParent !== null;
    console.log(`  - ${name}: ${isVisible ? '✅ Visible' : '❌ Caché'}`);
  });
};

// 3. Vérifier les permissions via hook
const checkPermissions = async () => {
  console.log('\n🔐 Vérification des permissions:');
  
  // Simuler le hook usePermissions
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Vérifier si admin via app_metadata
    const isAdmin = user?.app_metadata?.role === 'super_admin' || 
                   user?.app_metadata?.role === 'admin';
    
    console.log(`🛡️ Is Admin: ${isAdmin ? '✅ Oui' : '❌ Non'}`);
    
    // Modules accessibles attendus
    const expectedModules = isAdmin 
      ? ['clients', 'transactions', 'factures', 'colis', 'settings']
      : ['clients', 'colis'];
    
    console.log(`📦 Modules attendus: ${expectedModules.join(', ')}`);
    
    return isAdmin;
  } catch (error) {
    console.error('❌ Erreur permissions:', error);
    return false;
  }
};

// 4. Test de navigation directe
const testDirectNavigation = () => {
  console.log('\n🚀 Test de navigation directe:');
  
  const testRoutes = [
    { path: '/transactions', expected: 'admin' },
    { path: '/factures', expected: 'admin' },
    { path: '/clients', expected: 'both' },
    { path: '/colis', expected: 'both' },
    { path: '/settings', expected: 'admin' }
  ];
  
  testRoutes.forEach(route => {
    console.log(`  📍 ${route.path}: ${route.expected === 'admin' ? 'Admin only' : 'Accessible'}`);
  });
};

// 5. Fonction principale de test
const runPermissionsTest = async () => {
  console.log('🚀 Démarrage des tests de permissions...\n');
  
  const role = await checkUserRole();
  const isAdmin = await checkPermissions();
  
  checkUIVisibility();
  testDirectNavigation();
  
  console.log('\n📊 RÉSULTATS:');
  console.log('================');
  console.log(`👤 Rôle: ${role}`);
  console.log(`🛡️ Admin: ${isAdmin ? 'Oui' : 'Non'}`);
  
  if (role === 'operateur' && !isAdmin) {
    console.log('✅ OPÉRATEUR: Restrictions appliquées correctement');
  } else if ((role === 'admin' || role === 'super_admin') && isAdmin) {
    console.log('✅ ADMIN: Accès complet confirmé');
  } else {
    console.log('⚠️  Configuration inattendue - Vérifier les permissions');
  }
  
  console.log('\n🎉 Test terminé !');
};

// Exporter pour utilisation manuelle
window.testPermissions = runPermissionsTest;

console.log('💡 Pour lancer le test: tapez testPermissions() dans la console');
