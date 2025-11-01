import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Wallet, Building, DollarSign } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import type { CompteFinancier, CreateCompteFinancierData, UpdateCompteFinancierData } from '@/types';

const Comptes: React.FC = () => {
  const { 
    comptes, 
    loading, 
    error, 
    createCompte, 
    updateCompte, 
    deleteCompte,
    getComptesByType,
    getTotalBalance,
    getActiveComptes
  } = useComptesFinanciers();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCompte, setSelectedCompte] = useState<CompteFinancier | null>(null);
  const [formData, setFormData] = useState<CreateCompteFinancierData>({
    nom: '',
    type_compte: 'mobile_money',
    numero_compte: '',
    solde_actuel: 0,
    devise: 'USD',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedCompte) {
        // Update existing compte
        await updateCompte(selectedCompte.id, formData as UpdateCompteFinancierData);
        showSuccess('Compte mis à jour avec succès');
      } else {
        // Create new compte
        await createCompte(formData);
        showSuccess('Compte créé avec succès');
      }
      
      // Reset form
      setFormData({
        nom: '',
        type_compte: 'mobile_money',
        numero_compte: '',
        solde_actuel: 0,
        devise: 'USD',
        description: ''
      });
      setSelectedCompte(null);
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving compte:', error);
      showError(error.message || 'Erreur lors de la sauvegarde du compte');
    }
  };

  const handleEdit = (compte: CompteFinancier) => {
    setSelectedCompte(compte);
    setFormData({
      nom: compte.nom,
      type_compte: compte.type_compte,
      numero_compte: compte.numero_compte || '',
      solde_actuel: compte.solde_actuel,
      devise: compte.devise,
      description: compte.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (compte: CompteFinancier) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte "${compte.nom}" ?`)) {
      try {
        await deleteCompte(compte.id);
        showSuccess('Compte supprimé avec succès');
      } catch (error: any) {
        console.error('Error deleting compte:', error);
        showError(error.message || 'Erreur lors de la suppression du compte');
      }
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return <Wallet className="h-5 w-5" />;
      case 'banque':
        return <Building className="h-5 w-5" />;
      case 'cash':
        return <DollarSign className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'banque':
        return 'Banque';
      case 'cash':
        return 'Cash';
      default:
        return type;
    }
  };

  const activeComptes = getActiveComptes();
  const totalUSD = getTotalBalance('USD');
  const totalCDF = getTotalBalance('CDF');
  const mobileMoneyComptes = getComptesByType('mobile_money');
  const banqueComptes = getComptesByType('banque');
  const cashComptes = getComptesByType('cash');

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-red-600 text-center p-4">
          Erreur: {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Comptes Financiers</h1>
          <p className="text-gray-600">Gérez vos comptes Airtel, Orange, M-Pesa, Banque, Cash</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Compte
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Créer un nouveau compte</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau compte financier pour gérer vos transactions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du compte</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Airtel Money, Orange Money, Banque BCDC"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type_compte">Type de compte</Label>
                <Select
                  value={formData.type_compte}
                  onValueChange={(value: 'mobile_money' | 'banque' | 'cash') =>
                    setFormData({ ...formData, type_compte: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="banque">Banque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="numero_compte">Numéro de compte</Label>
                <Input
                  id="numero_compte"
                  value={formData.numero_compte}
                  onChange={(e) => setFormData({ ...formData, numero_compte: e.target.value })}
                  placeholder="Numéro de téléphone ou numéro de compte bancaire"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="solde_actuel">Solde actuel</Label>
                  <Input
                    id="solde_actuel"
                    type="number"
                    step="0.01"
                    value={formData.solde_actuel}
                    onChange={(e) => setFormData({ ...formData, solde_actuel: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="devise">Devise</Label>
                  <Select
                    value={formData.devise}
                    onValueChange={(value: 'USD' | 'CDF') =>
                      setFormData({ ...formData, devise: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Devise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CDF">CDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description optionnelle du compte"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comptes</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeComptes.length}</div>
            <p className="text-xs text-muted-foreground">Comptes actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde Total USD</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalUSD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">En dollars américains</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde Total CDF</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCDF.toFixed(2)} CDF</div>
            <p className="text-xs text-muted-foreground">En francs congolais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobile Money</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mobileMoneyComptes.length}</div>
            <p className="text-xs text-muted-foreground">Comptes mobile money</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {comptes.map((compte) => (
          <Card key={compte.id} className={`${!compte.is_active ? 'opacity-50' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                {getAccountIcon(compte.type_compte)}
                <CardTitle className="text-lg">{compte.nom}</CardTitle>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(compte)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(compte)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Type:</span>
                  <Badge variant="secondary">
                    {getAccountTypeLabel(compte.type_compte)}
                  </Badge>
                </div>
                {compte.numero_compte && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Numéro:</span>
                    <span className="text-sm font-mono">{compte.numero_compte}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Solde:</span>
                  <span className="text-lg font-bold">
                    {compte.devise === 'USD' ? '$' : ''}{compte.solde_actuel.toFixed(2)} {compte.devise === 'CDF' ? 'CDF' : ''}
                  </span>
                </div>
                {!compte.is_active && (
                  <Badge variant="destructive" className="w-full justify-center">
                    Inactif
                  </Badge>
                )}
                {compte.description && (
                  <p className="text-sm text-gray-600 mt-2">{compte.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du compte financier.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit_nom">Nom du compte</Label>
              <Input
                id="edit_nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_type_compte">Type de compte</Label>
              <Select
                value={formData.type_compte}
                onValueChange={(value: 'mobile_money' | 'banque' | 'cash') =>
                  setFormData({ ...formData, type_compte: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="banque">Banque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_numero_compte">Numéro de compte</Label>
              <Input
                id="edit_numero_compte"
                value={formData.numero_compte}
                onChange={(e) => setFormData({ ...formData, numero_compte: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_solde_actuel">Solde actuel</Label>
                <Input
                  id="edit_solde_actuel"
                  type="number"
                  step="0.01"
                  value={formData.solde_actuel}
                  onChange={(e) => setFormData({ ...formData, solde_actuel: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_devise">Devise</Label>
                <Select
                  value={formData.devise}
                  onValueChange={(value: 'USD' | 'CDF') =>
                    setFormData({ ...formData, devise: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Mettre à jour</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
};

export default Comptes;
