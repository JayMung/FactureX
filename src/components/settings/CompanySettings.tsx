import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Upload, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

export const CompanySettings = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [companySettings, setCompanySettings] = useState({
    nom_entreprise: '',
    logo_url: '',
    rccm: '',
    idnat: '',
    nif: '',
    email_entreprise: '',
    telephone_entreprise: '',
    adresse_entreprise: '',
    signature_url: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('categorie', 'company');

      if (data) {
        const company: any = {};
        data.forEach(item => {
          company[item.cle] = item.valeur;
        });
        setCompanySettings(prev => ({ ...prev, ...company }));
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      showError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(companySettings).map(([cle, valeur]) => ({
        categorie: 'company',
        cle,
        valeur: valeur || ''
      }));

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' });

      if (error) throw error;
      showSuccess('Informations entreprise sauvegardées');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'signature'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company')
        .getPublicUrl(fileName);

      const settingKey = type === 'logo' ? 'logo_url' : 'signature_url';
      
      setCompanySettings(prev => ({ ...prev, [settingKey]: publicUrl }));

      const { error } = await supabase
        .from('settings')
        .upsert([{
          categorie: 'company',
          cle: settingKey,
          valeur: publicUrl
        }], { onConflict: 'categorie,cle' });

      if (error) throw error;

      showSuccess(`${type === 'logo' ? 'Logo' : 'Signature'} uploadé avec succès`);
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      showError(error.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="mr-2 h-5 w-5" />
          Informations Entreprise
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nom de l'entreprise</Label>
            <Input
              value={companySettings.nom_entreprise}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, nom_entreprise: e.target.value }))}
              placeholder="COCCINELLE SARL"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={companySettings.email_entreprise}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, email_entreprise: e.target.value }))}
              placeholder="sales@coccinelledrc.com"
            />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input
              value={companySettings.telephone_entreprise}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, telephone_entreprise: e.target.value }))}
              placeholder="+243970746213"
            />
          </div>
          <div>
            <Label>RCCM</Label>
            <Input
              value={companySettings.rccm}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, rccm: e.target.value }))}
              placeholder="RCCM: CD/KNG/RCCM/21-B-02464"
            />
          </div>
          <div>
            <Label>IDNAT</Label>
            <Input
              value={companySettings.idnat}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, idnat: e.target.value }))}
              placeholder="01-XXX-XXXXXXX"
            />
          </div>
          <div>
            <Label>NIF</Label>
            <Input
              value={companySettings.nif}
              onChange={(e) => setCompanySettings(prev => ({ ...prev, nif: e.target.value }))}
              placeholder="A XXXXXXXXX X"
            />
          </div>
        </div>
        <div>
          <Label>Adresse</Label>
          <Textarea
            value={companySettings.adresse_entreprise}
            onChange={(e) => setCompanySettings(prev => ({ ...prev, adresse_entreprise: e.target.value }))}
            placeholder="24, Hortense Mbuyu, Lubumbashi , RDC"
            rows={2}
          />
        </div>

        {/* Logo */}
        <div>
          <Label>Logo de l'entreprise</Label>
          <div className="flex items-center space-x-4 mt-2">
            {companySettings.logo_url && (
              <img src={companySettings.logo_url} alt="Logo" className="h-16 w-16 object-contain border rounded" />
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'logo')}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Upload...' : 'Choisir logo'}
            </Button>
          </div>
        </div>

        {/* Signature */}
        <div>
          <Label>Signature/Stamp (PNG sans fond)</Label>
          <div className="flex items-center space-x-4 mt-2">
            {companySettings.signature_url && (
              <img src={companySettings.signature_url} alt="Signature" className="h-16 w-32 object-contain border rounded" />
            )}
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/png"
              onChange={(e) => handleImageUpload(e, 'signature')}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => signatureInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Upload...' : 'Choisir signature'}
            </Button>
          </div>
        </div>

        <Button onClick={handleSaveCompanySettings} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sauvegarder les informations
        </Button>
      </CardContent>
    </Card>
  );
};
