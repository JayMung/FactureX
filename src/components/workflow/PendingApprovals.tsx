import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  AlertTriangle,
  Eye,
  MessageSquare,
  Loader2
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { TransactionApproval } from '@/types';
import { toast } from 'sonner';

interface PendingApprovalsProps {
  onTransactionSelect?: (transactionId: string) => void;
}

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({
  onTransactionSelect,
}) => {
  const { usePendingApprovals, approveTransaction, rejectTransaction } = useApprovalWorkflow();
  const { data: approvals = [], isLoading, error } = usePendingApprovals();
  const [selectedApproval, setSelectedApproval] = useState<TransactionApproval | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);

  const handleApprove = async (approval: TransactionApproval) => {
    try {
      await approveTransaction.mutateAsync({
        transactionId: approval.transaction_id,
        approvalLevel: approval.approval_level,
        notes: approvalNotes || undefined
      });
      setApprovalDialogOpen(false);
      setApprovalNotes('');
      setSelectedApproval(null);
    } catch (error) {
      console.error('Erreur approbation:', error);
    }
  };

  const handleReject = async (approval: TransactionApproval) => {
    if (!rejectionReason.trim()) {
      toast.error('La raison du rejet est obligatoire');
      return;
    }

    try {
      await rejectTransaction.mutateAsync({
        transactionId: approval.transaction_id,
        approvalLevel: approval.approval_level,
        rejectionReason
      });
      setRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedApproval(null);
    } catch (error) {
      console.error('Erreur rejet:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getApprovalLevelBadge = (level: number, required: number, current: number) => {
    const percentage = Math.round((current / required) * 100);
    const color = percentage === 100 ? 'bg-green-500' : percentage > 0 ? 'bg-blue-500' : 'bg-yellow-500';
    
    return (
      <Badge variant="outline" className={`${color} text-white`}>
        Niveau {level}: {current}/{required}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'CDF' ? 'CDF' : 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
            <p className="text-muted-foreground mb-4">
              Impossible de charger les approbations en attente
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Approbations en Attente</h2>
          <p className="text-muted-foreground">
            Transactions requérant votre validation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {approvals.length} en attente
          </Badge>
        </div>
      </div>

      {/* Liste des approbations */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Chargement des approbations...</span>
            </div>
          </CardContent>
        </Card>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune approbation en attente</h3>
              <p className="text-muted-foreground">
                Toutes les transactions sont à jour
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Informations principales */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(approval.approval_status)}
                      <h3 className="font-semibold text-lg">
                        Transaction #{approval.transaction_id.slice(0, 8)}...
                      </h3>
                      {getApprovalLevelBadge(
                        approval.approval_level,
                        approval.required_approvals,
                        0 // TODO: Calculer le nombre actuel d'approbations
                      )}
                    </div>

                    {/* Détails de la transaction */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(approval.transaction_amount || 0)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {approval.transaction_type || 'Non spécifié'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(approval.requested_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </div>

                    {/* Informations sur le demandeur */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Demandé par: {approval.created_by_email || 'Utilisateur inconnu'}</span>
                      <span>•</span>
                      <span>Organisation: {approval.organization_id?.slice(0, 8)}...</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {onTransactionSelect && (
                      <Button
                        onClick={() => onTransactionSelect(approval.transaction_id)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setSelectedApproval(approval);
                            setApprovalNotes('');
                          }}
                          size="sm"
                          disabled={approveTransaction.isPending}
                        >
                          {approveTransaction.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approuver la Transaction</DialogTitle>
                          <DialogDescription>
                            Confirmez l'approbation de cette transaction
                          </DialogDescription>
                        </DialogHeader>
                        {selectedApproval && (
                          <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <div className="flex justify-between items-center">
                                <span>Montant:</span>
                                <span className="font-semibold">
                                  {formatCurrency(selectedApproval.transaction_amount || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span>Type:</span>
                                <span>{selectedApproval.transaction_type || 'Non spécifié'}</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="approval-notes">Notes (optionnel)</Label>
                              <Textarea
                                id="approval-notes"
                                placeholder="Ajoutez des commentaires sur cette approbation..."
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="flex justify-end gap-3">
                              <Button
                                variant="outline"
                                onClick={() => setApprovalDialogOpen(false)}
                              >
                                Annuler
                              </Button>
                              <Button
                                onClick={() => handleApprove(selectedApproval)}
                                disabled={approveTransaction.isPending}
                              >
                                {approveTransaction.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Approbation...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approuver
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <AlertDialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          onClick={() => {
                            setSelectedApproval(approval);
                            setRejectionReason('');
                          }}
                          variant="destructive"
                          size="sm"
                          disabled={rejectTransaction.isPending}
                        >
                          {rejectTransaction.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rejeter la Transaction</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action marquera la transaction comme rejetée. Veuillez indiquer la raison.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        {selectedApproval && (
                          <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <div className="flex justify-between items-center">
                                <span>Montant:</span>
                                <span className="font-semibold">
                                  {formatCurrency(selectedApproval.transaction_amount || 0)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="rejection-reason">Raison du rejet *</Label>
                              <Textarea
                                id="rejection-reason"
                                placeholder="Expliquez pourquoi cette transaction est rejetée..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                                required
                              />
                            </div>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleReject(selectedApproval)}
                                disabled={rejectTransaction.isPending || !rejectionReason.trim()}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {rejectTransaction.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Rejet...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rejeter
                                  </>
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </div>
                        )}
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
