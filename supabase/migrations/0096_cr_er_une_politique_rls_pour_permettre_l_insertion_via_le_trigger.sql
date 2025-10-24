-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Créer de nouvelles politiques plus permissives
CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for authenticated users" ON profiles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON profiles
    FOR DELETE
    TO authenticated
    USING (true);