import { useState } from 'react';
import { Plus, DollarSign, TrendingUp, Calendar, Filter, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePaiements, useCreatePaiement, useDeletePaiement, usePaiementStats, CreatePaiementData } from '@/hooks/usePaiements';
import { useAllClients } from '@/hooks/useClients';
import { useFactures } from '@/hooks/useFactures';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Encaissements() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type_paiement: '',
    client_id: '',
    compte_id: '',
    date_debut: '',
    date_fin: '',
    search: '',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = usePaiements(page, filters);
  const { data: stats } = usePaiementStats(filters);
  const { clients } = useAllClients();
  const { data: facturesData } = useFactures(1, { statut_paiement: 'partiel,non_paye' });
  const { comptes: comptesData } = useComptesFinanciers();

  const createPaiement = useCreatePaiement();
  const deletePaiement = useDeletePaiement();

  const [formData, setFormData] = useState<CreatePaiementData>({
    type_paiement: 'facture',
    client_id: '',
    montant_paye: 0,
    compte_id: '',
    mode_paiement: '',
    date_paiement: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPaiement.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({
      type_paiement: 'facture',
      client_id: '',
      montant_paye: 0,
      compte_id: '',
      mode_paiement: '',
      date_paiement: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deletePaiement.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    if (!data?.paiements) return;

    const headers = ['Date', 'Type', 'Client', 'Facture/Colis', 'Montant', 'Compte', 'Mode', 'Notes'];
    const rows = data.paiements.map(p => [
      format(new Date(p.date_paiement), 'dd/MM/yyyy', { locale: fr }),
      p.type_paiement === 'facture' ? 'Facture' : 'Colis',
      p.client?.nom || '',
      p.facture?.numero_facture || p.colis_id || '',
      `${p.montant_paye} USD`,
      p.compte?.nom || '',
      p.mode_paiement || '',
      p.notes || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `encaissements_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Filter factures by selected client
  const filteredFactures = formData.client_id
    ? facturesData?.factures.filter(f => f.client_id === formData.client_id)
    : facturesData?.factures;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Encaissements</h1>
          <p className="text-muted-foreground">
            Enregistrez les paiements des factures et colis
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel encaissement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enregistrer un encaissement</DialogTitle>
              <DialogDescription>
                Enregistrez un paiement reçu pour une facture ou un colis
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type_paiement}
                    onValueChange={(value: 'facture' | 'colis') =>
                      setFormData({ ...formData, type_paiement: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facture">Facture</SelectItem>
                      <SelectItem value="colis">Colis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, client_id: value, facture_id: undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nom} - {client.telephone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.type_paiement === 'facture' && (
                  <div className="space-y-2">
                    <Label>Facture *</Label>
                    <Select
                      value={formData.facture_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, facture_id: value })
                      }
                      disabled={!formData.client_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredFactures?.map((facture) => (
                          <SelectItem key={facture.id} value={facture.id}>
                            {facture.numero_facture} - {facture.montant_total} USD
                            {facture.solde_restant && ` (Reste: ${facture.solde_restant} USD)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Montant payé (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.montant_paye}
                    onChange={(e) =>
                      setFormData({ ...formData, montant_paye: parseFloat(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Compte de réception *</Label>
                  <Select
                    value={formData.compte_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, compte_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {comptesData
                        ?.filter((c) => c.is_active)
                        .map((compte) => (
                          <SelectItem key={compte.id} value={compte.id}>
                            {compte.nom} ({compte.type_compte})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <Select
                    value={formData.mode_paiement}
                    onValueChange={(value) =>
                      setFormData({ ...formData, mode_paiement: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Espèces">Espèces</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Virement">Virement</SelectItem>
                      <SelectItem value="Chèque">Chèque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date de paiement *</Label>
                  <Input
                    type="date"
                    value={formData.date_paiement}
                    onChange={(e) =>
                      setFormData({ ...formData, date_paiement: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Notes additionnelles..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createPaiement.isPending}>
                  {createPaiement.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total encaissé</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.total.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.count || 0} encaissement(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalToday.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.countToday || 0} paiement(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalFactures.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">Paiements factures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colis</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalColis.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">Paiements colis</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={filters.type_paiement}
                onValueChange={(value) =>
                  setFilters({ ...filters, type_paiement: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  <SelectItem value="facture">Facture</SelectItem>
                  <SelectItem value="colis">Colis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={filters.client_id}
                onValueChange={(value) =>
                  setFilters({ ...filters, client_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Compte</Label>
              <Select
                value={filters.compte_id}
                onValueChange={(value) =>
                  setFilters({ ...filters, compte_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {comptesData?.map((compte) => (
                    <SelectItem key={compte.id} value={compte.id}>
                      {compte.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date début</Label>
              <Input
                type="date"
                value={filters.date_debut}
                onChange={(e) =>
                  setFilters({ ...filters, date_debut: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input
                type="date"
                value={filters.date_fin}
                onChange={(e) =>
                  setFilters({ ...filters, date_fin: e.target.value })
                }
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setFilters({
                  type_paiement: '',
                  client_id: '',
                  compte_id: '',
                  date_debut: '',
                  date_fin: '',
                  search: '',
                })
              }
            >
              Réinitialiser
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des encaissements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Client</th>
                      <th className="text-left p-2">Facture/Colis</th>
                      <th className="text-right p-2">Montant</th>
                      <th className="text-left p-2">Compte</th>
                      <th className="text-left p-2">Mode</th>
                      <th className="text-left p-2">Notes</th>
                      <th className="text-center p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.paiements.map((paiement) => (
                      <tr key={paiement.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          {format(new Date(paiement.date_paiement), 'dd/MM/yyyy', { locale: fr })}
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            paiement.type_paiement === 'facture'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {paiement.type_paiement === 'facture' ? 'Facture' : 'Colis'}
                          </span>
                        </td>
                        <td className="p-2">{paiement.client?.nom}</td>
                        <td className="p-2">{paiement.facture?.numero_facture || paiement.colis_id}</td>
                        <td className="p-2 text-right font-semibold">${paiement.montant_paye}</td>
                        <td className="p-2">{paiement.compte?.nom}</td>
                        <td className="p-2">{paiement.mode_paiement || '-'}</td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {paiement.notes || '-'}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(paiement.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} sur {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === data.totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet encaissement ? Cette action est irréversible
              et mettra à jour le solde de la facture/colis et du compte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
