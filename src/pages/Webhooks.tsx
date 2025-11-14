import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWebhooks } from '@/hooks';
import { Plus, Trash2, Webhook, AlertCircle, Edit, Power, PowerOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from '@/components/ui/checkbox';

const WEBHOOK_EVENTS = {
  'transaction.created': 'Transaction créée',
  'transaction.validated': 'Transaction validée',
  'transaction.deleted': 'Transaction supprimée',
  'paiement.created': 'Encaissement reçu',
  'paiement.updated': 'Encaissement modifié',
  'paiement.deleted': 'Encaissement supprimé',
  'facture.created': 'Facture créée',
  'facture.validated': 'Facture validée',
  'facture.paid': 'Facture payée',
  'facture.deleted': 'Facture supprimée',
  'client.created': 'Client créé',
  'client.updated': 'Client mis à jour',
  'client.deleted': 'Client supprimé',
  'colis.created': 'Colis créé',
  'colis.delivered': 'Colis livré',
  'colis.status_changed': 'Statut colis changé',
  'colis.deleted': 'Colis supprimé',
};

const WEBHOOK_FORMATS = [
  { value: 'json', label: 'JSON (Standard)' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'n8n', label: 'n8n' },
];

export default function Webhooks() {
  usePageSetup({
    title: 'Webhooks',
    subtitle: 'Configurez des notifications en temps réel'
  });

  const { toast } = useToast();
  const { webhooks, loading, createWebhook, updateWebhook, deleteWebhook, toggleWebhook } = useWebhooks();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any | null>(null);
  
  const [webhookData, setWebhookData] = useState<{
    name: string;
    url: string;
    events: string[];
    format: 'json' | 'discord' | 'slack' | 'n8n';
    secret: string;
    filters: {
      montant_min?: number;
      devise?: string;
      client_id?: string;
    };
  }>({
    name: '',
    url: '',
    events: [],
    format: 'json',
    secret: '',
    filters: {},
  });

  const handleCreateWebhook = async () => {
    if (!webhookData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du webhook est requis',
        variant: 'destructive',
      });
      return;
    }

    if (!webhookData.url.trim()) {
      toast({
        title: 'Erreur',
        description: 'L\'URL du webhook est requise',
        variant: 'destructive',
      });
      return;
    }

    if (webhookData.events.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Sélectionnez au moins un événement',
        variant: 'destructive',
      });
      return;
    }

    const success = await createWebhook(webhookData);
    if (success) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleUpdateWebhook = async () => {
    if (!selectedWebhook) return;

    const success = await updateWebhook(selectedWebhook.id, webhookData);
    if (success) {
      setIsEditDialogOpen(false);
      setSelectedWebhook(null);
      resetForm();
    }
  };

  const handleDeleteWebhook = async () => {
    if (!selectedWebhook) return;

    const success = await deleteWebhook(selectedWebhook.id);
    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedWebhook(null);
    }
  };

  const handleToggleWebhook = async (webhook: any) => {
    await toggleWebhook(webhook.id, !webhook.is_active);
  };

  const openEditDialog = (webhook: any) => {
    setSelectedWebhook(webhook);
    setWebhookData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      format: webhook.format,
      secret: webhook.secret || '',
      filters: webhook.filters || {},
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (webhook: any) => {
    setSelectedWebhook(webhook);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setWebhookData({
      name: '',
      url: '',
      events: [],
      format: 'json',
      secret: '',
      filters: {},
    });
  };

  const toggleEvent = (event: string) => {
    if (webhookData.events.includes(event)) {
      setWebhookData({
        ...webhookData,
        events: webhookData.events.filter(e => e !== event),
      });
    } else {
      setWebhookData({
        ...webhookData,
        events: [...webhookData.events, event],
      });
    }
  };

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case 'discord':
        return 'bg-indigo-500';
      case 'slack':
        return 'bg-purple-500';
      case 'n8n':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground mt-2">
            Configurez des webhooks pour recevoir des notifications en temps réel
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Webhook
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
            <AlertCircle className="mr-2 h-5 w-5" />
            À propos des Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200">
          <ul className="list-disc list-inside space-y-2">
            <li>Les webhooks envoient des notifications HTTP POST à votre URL</li>
            <li>Vous pouvez filtrer par montant minimum, devise, ou client</li>
            <li>Formats supportés : JSON, Discord, Slack, n8n</li>
            <li>Les webhooks peuvent être activés/désactivés sans les supprimer</li>
            <li>Un secret HMAC est généré pour sécuriser les requêtes</li>
          </ul>
        </CardContent>
      </Card>

      {/* Webhooks List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Chargement des webhooks...
            </CardContent>
          </Card>
        ) : webhooks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Webhook className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun webhook configuré</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                Créer votre premier webhook
              </Button>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{webhook.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge className={getFormatBadgeColor(webhook.format)}>
                          {webhook.format.toUpperCase()}
                        </Badge>
                        <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                          {webhook.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleWebhook(webhook)}
                      title={webhook.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {webhook.is_active ? (
                        <PowerOff className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Power className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(webhook)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(webhook)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">URL</p>
                    <p className="font-mono text-xs truncate">{webhook.url}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Créé le</p>
                    <p className="font-medium">
                      {new Date(webhook.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dernière exécution</p>
                    <p className="font-medium">
                      {webhook.last_triggered_at
                        ? new Date(webhook.last_triggered_at).toLocaleDateString('fr-FR')
                        : 'Jamais'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Événements</p>
                    <p className="font-medium">{webhook.events.length} événement(s)</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Événements écoutés :</p>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event: string) => (
                      <Badge key={event} variant="outline">
                        {WEBHOOK_EVENTS[event as keyof typeof WEBHOOK_EVENTS] || event}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Webhook Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedWebhook(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? 'Modifier le Webhook' : 'Créer un Nouveau Webhook'}
            </DialogTitle>
            <DialogDescription>
              Configurez votre webhook pour recevoir des notifications en temps réel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du webhook *</Label>
              <Input
                id="name"
                placeholder="Ex: Discord Notifications, Slack Alerts"
                value={webhookData.name}
                onChange={(e) => setWebhookData({ ...webhookData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL du webhook *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookData.url}
                onChange={(e) => setWebhookData({ ...webhookData, url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Format *</Label>
              <select
                id="format"
                value={webhookData.format}
                onChange={(e) => setWebhookData({ ...webhookData, format: e.target.value as any })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {WEBHOOK_FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Événements *</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(WEBHOOK_EVENTS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={webhookData.events.includes(key)}
                      onCheckedChange={() => toggleEvent(key)}
                    />
                    <label
                      htmlFor={key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret">Secret HMAC (optionnel)</Label>
              <Input
                id="secret"
                type="password"
                placeholder="Laissez vide pour générer automatiquement"
                value={webhookData.secret}
                onChange={(e) => setWebhookData({ ...webhookData, secret: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Utilisé pour signer les requêtes et vérifier leur authenticité
              </p>
            </div>

            <div className="space-y-2">
              <Label>Filtres (optionnel)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="montant_min" className="text-xs">Montant minimum</Label>
                  <Input
                    id="montant_min"
                    type="number"
                    placeholder="Ex: 100"
                    value={webhookData.filters.montant_min || ''}
                    onChange={(e) => setWebhookData({
                      ...webhookData,
                      filters: { ...webhookData.filters, montant_min: parseFloat(e.target.value) || undefined }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="devise" className="text-xs">Devise</Label>
                  <select
                    id="devise"
                    value={webhookData.filters.devise || ''}
                    onChange={(e) => setWebhookData({
                      ...webhookData,
                      filters: { ...webhookData.filters, devise: e.target.value || undefined }
                    })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Toutes</option>
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              resetForm();
            }}>
              Annuler
            </Button>
            <Button onClick={isEditDialogOpen ? handleUpdateWebhook : handleCreateWebhook}>
              {isEditDialogOpen ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce webhook ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Vous ne recevrez plus de notifications de ce webhook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWebhook} className="bg-destructive">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Layout>
  );
}
