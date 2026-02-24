import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Upload, Loader2, Save } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

export const CompanySettings = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
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
        setIsDirty(false);
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
      setIsDirty(false);
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setCompanySettings(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'signature'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingSignature(true);
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
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingSignature(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-16 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
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
            <Label htmlFor="company-nom">Nom de l'entreprise</Label>
            <Input
              id="company-nom"
              value={companySettings.nom_entreprise}
              onChange={(e) => handleFieldChange('nom_entreprise', e.target.value)}
              placeholder="COCCINELLE SARL"
            />
          </div>
          <div>
            <Label htmlFor="company-email">Email</Label>
            <Input
              id="company-email"
              type="email"
              value={companySettings.email_entreprise}
              onChange={(e) => handleFieldChange('email_entreprise', e.target.value)}
              placeholder="sales@coccinelledrc.com"
            />
          </div>
          <div>
            <Label htmlFor="company-telephone">Téléphone</Label>
            <Input
              id="company-telephone"
              value={companySettings.telephone_entreprise}
              onChange={(e) => handleFieldChange('telephone_entreprise', e.target.value)}
              placeholder="+243970746213"
            />
          </div>
          <div>
            <Label htmlFor="company-rccm">RCCM</Label>
            <Input
              id="company-rccm"
              value={companySettings.rccm}
              onChange={(e) => handleFieldChange('rccm', e.target.value)}
              placeholder="RCCM: CD/KNG/RCCM/21-B-02464"
            />
          </div>
          <div>
            <Label htmlFor="company-idnat">IDNAT</Label>
            <Input
              id="company-idnat"
              value={companySettings.idnat}
              onChange={(e) => handleFieldChange('idnat', e.target.value)}
              placeholder="01-XXX-XXXXXXX"
            />
          </div>
          <div>
            <Label htmlFor="company-nif">NIF</Label>
            <Input
              id="company-nif"
              value={companySettings.nif}
              onChange={(e) => handleFieldChange('nif', e.target.value)}
              placeholder="A XXXXXXXXX X"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="company-adresse">Adresse</Label>
          <Textarea
            id="company-adresse"
            value={companySettings.adresse_entreprise}
            onChange={(e) => handleFieldChange('adresse_entreprise', e.target.value)}
            placeholder="24, Hortense Mbuyu, Lubumbashi , RDC"
            rows={2}
          />
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Visuels</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Logo */}
            <div>
              <Label className="text-sm text-gray-600">Logo de l'entreprise</Label>
              <div className="flex items-center gap-3 mt-2">
                <div className="h-16 w-16 border rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
                  {companySettings.logo_url
                    ? <img src={companySettings.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    : <Building2 className="h-6 w-6 text-gray-300" />}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploadingLogo ? 'Upload...' : 'Choisir'}
                </Button>
              </div>
            </div>
            {/* Signature */}
            <div>
              <Label className="text-sm text-gray-600">Signature / Tampon (PNG sans fond)</Label>
              <div className="flex items-center gap-3 mt-2">
                <div className="h-16 w-32 border rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
                  {companySettings.signature_url
                    ? <img src={companySettings.signature_url} alt="Signature" className="h-full w-full object-contain" />
                    : <span className="text-xs text-gray-400 text-center px-1">Aucune signature</span>}
                </div>
                <input ref={signatureInputRef} type="file" accept="image/png" onChange={(e) => handleImageUpload(e, 'signature')} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => signatureInputRef.current?.click()} disabled={uploadingSignature}>
                  {uploadingSignature ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploadingSignature ? 'Upload...' : 'Choisir'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          {isDirty && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              Modifications non sauvegardées
            </p>
          )}
          <Button
            onClick={handleSaveCompanySettings}
            disabled={saving}
            className={`ml-auto bg-green-500 hover:bg-green-600 ${isDirty ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sauvegarder les informations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
