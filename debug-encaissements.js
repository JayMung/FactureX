// Copiez-collez ces commandes dans la console (F12) sur la page Encaissements
// et envoyez-moi les résultats

console.log('=== DEBUG ENCAISSEMENTS ===');

// 1. Factures chargées
console.log('Factures data:', facturesData?.slice(0,3));

// 2. Factures filtrées (celles qui s'affichent dans le Select)
console.log('Filtered factures:', filteredFactures?.map(f => ({
  id: typeof f.id,
  idValue: f.id,
  numero: f.facture_number,
  total: f.total_general,
  devise: f.devise
})));

// 3. Clients
console.log('Clients:', clients?.slice(0,2)?.map(c => ({
  id: typeof c.id,
  idValue: c.id,
  nom: c.nom
})));

// 4. Comptes
console.log('Comptes:', comptesData?.slice(0,2)?.map(c => ({
  id: typeof c.id,
  idValue: c.id,
  nom: c.nom
})));

// 5. Vérifier les IDs problématiques
const badIds = facturesData?.filter(f => 
  typeof f.id !== 'string' || 
  f.id === null || 
  f.id === undefined || 
  f.id === ''
);
console.log('Factures avec ID problématiques:', badIds);

console.log('=== FIN DEBUG ===');
