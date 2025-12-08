import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import { useCreatePaiement, CreatePaiementData } from '@/hooks/usePaiements';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { DollarSign } from 'lucide-react';

interface PaiementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'facture' | 'colis';
  factureId?: string;
  colisId?: string;
  clientId: string;
  clientNom: string;
  montantTotal?: number;
  montantRestant?: number;
  numeroFacture?: string;
  onSuccess?: () => void;
}

export function PaiementDialog({
  open,
  onOpenChange,
  type,
  factureId,
  colisId,
  clientId,
  clientNom,
  montantTotal,
  montantRestant,
  numeroFacture,
  onSuccess,
}: PaiementDialogProps) {
  const { comptes: comptesData } = useComptesFinanciers();
  const createPaiement = useCreatePaiement();

  const [formData, setFormData] = useState<CreatePaiementData>({
    type_paiement: type,
    facture_id: factureId,
    colis_id: colisId,
    client_id: clientId,
    montant_paye: montantRestant || montantTotal || 0,
    compte_id: '',
    mode_paiement: '',
    date_paiement: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Mettre à jour le formulaire quand les props changent
  useEffect(() => {
    setFormData({
      type_paiement: type,
      facture_id: factureId,
      colis_id: colisId,
      client_id: clientId,
      montant_paye: montantRestant || montantTotal || 0,
      compte_id: '',
      mode_paiement: '',
      date_paiement: new Date().toISOString().split('T')[0],
      notes: '',
    });
  }, [type, factureId, colisId, clientId, montantTotal, montantRestant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPaiement.mutateAsync(formData);
      onSuccess?.();
      onOpenChange(false);
      // Réinitialiser le formulaire
      setFormData({
        type_paiement: type,
        facture_id: factureId,
        colis_id: colisId,
        client_id: clientId,
        montant_paye: montantRestant || montantTotal || 0,
        compte_id: '',
        mode_paiement: '',
        date_paiement: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Enregistrer un paiement
          </DialogTitle>
          <DialogDescription>
            Enregistrez un paiement pour {type === 'facture' ? 'la facture' : 'le colis'}{' '}
            {numeroFacture && `N° ${numeroFacture}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informations pré-remplies */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Client:</span>
              <span className="text-sm">{clientNom}</span>
            </div>
            {numeroFacture && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {type === 'facture' ? 'Facture' : 'Colis'}:
                </span>
                <span className="text-sm">{numeroFacture}</span>
              </div>
            )}
            {montantTotal && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Montant total:</span>
                <span className="text-sm font-semibold">${montantTotal.toFixed(2)}</span>
              </div>
            )}
            {montantRestant !== undefined && montantRestant !== montantTotal && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-600">Montant restant:</span>
                <span className="text-sm font-semibold text-orange-600">
                  ${montantRestant.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Montant payé (USD) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.montant_paye}
                onChange={(e) =>
                  setFormData({ ...formData, montant_paye: parseFloat(e.target.value) || 0 })
                }
                required
                className="text-lg font-semibold"
              />
              {montantRestant !== undefined && formData.montant_paye > montantRestant && (
                <p className="text-xs text-blue-600">
                  ℹ️ Montant supérieur au prévu (marge incluse)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Compte de réception *</Label>
              <Select
                value={formData.compte_id}
                onValueChange={(value) => setFormData({ ...formData, compte_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {comptesData && comptesData.length > 0 ? (
                    comptesData
                      .filter((c) => c.is_active && typeof c?.id === 'string' && c.id.trim().length > 0)
                      .map((compte) => (
                        <SelectItem key={String(compte.id)} value={String(compte.id)}>
                          {compte.nom} ({compte.type_compte}) - {compte.solde_actuel} {compte.devise}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="__no_compte__" disabled>
                      Aucun compte disponible
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mode de paiement *</Label>
              <Select
                value={formData.mode_paiement}
                onValueChange={(value) => setFormData({ ...formData, mode_paiement: value })}
                required
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
                onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createPaiement.isPending}>
              {createPaiement.isPending ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
