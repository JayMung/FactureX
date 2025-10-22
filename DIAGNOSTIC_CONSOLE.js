// Copiez ce code dans la console du navigateur (F12) et exécutez-le
// Cela va vérifier la configuration de l'avatar

(async () => {
  console.log('🔍 DIAGNOSTIC DE L\'AVATAR\n');
  
  // 1. Vérifier l'utilisateur actuel
  console.log('1️⃣ Utilisateur actuel:');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('User ID:', user?.id);
  console.log('Email:', user?.email);
  console.log('Avatar URL dans metadata:', user?.user_metadata?.avatar_url);
  
  // 2. Vérifier la table profiles
  console.log('\n2️⃣ Profil dans la base de données:');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();
  
  if (profileError) {
    console.error('Erreur:', profileError);
  } else {
    console.log('Avatar URL dans profiles:', profile?.avatar_url);
  }
  
  // 3. Lister les fichiers dans avatars
  console.log('\n3️⃣ Fichiers dans le bucket avatars:');
  const { data: files, error: listError } = await supabase.storage
    .from('avatars')
    .list();
    
  if (listError) {
    console.error('Erreur:', listError);
  } else {
    console.log(`${files?.length || 0} fichier(s) trouvé(s):`);
    files?.forEach(file => {
      console.log(`  - ${file.name}`);
      
      // Générer l'URL publique
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(file.name);
      console.log(`    URL: ${data.publicUrl}`);
    });
  }
  
  // 4. Test d'upload
  console.log('\n4️⃣ Pour tester l\'upload:');
  console.log('Cliquez sur "Changer la photo" et sélectionnez une image');
  console.log('Puis vérifiez les messages de la console');
})();
