import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useApiKeys } from '@/hooks/useApiKeys';
import { Plus, Copy, Eye, EyeOff, Trash2, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const API_PERMISSIONS = {
  'read:stats': 'Lire les statistiques',
  'read:transactions': 'Lire les transactions',
  'read:clients': 'Lire les clients',
  'read:factures': 'Lire les factures',
  'read:colis': 'Lire les colis',
  'read:comptes': 'Lire les comptes financiers',
  'read:mouvements': 'Lire les mouvements de comptes',
  'write:webhooks': 'Créer et gérer les webhooks',
  'write:transactions': 'Créer des transactions',
  'admin:keys': 'Gérer les clés API',
  'admin:webhooks': 'Gérer tous les webhooks',
  '*': 'Accès complet',
};

const DEFAULT_PERMISSIONS_BY_TYPE = {
  public: ['read:stats'],
  secret: ['read:transactions', 'read:clients', 'read:factures', 'read:colis', 'read:stats', 'write:webhooks'],
  admin: ['*'],
};

export default function ApiKeys() {
  const { toast } = useToast();
  const { apiKeys, loading, createApiKey, deleteApiKey } = useApiKeys();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedKeyForDelete, setSelectedKeyForDelete] = useState<string | null>(null);
  const [newKeyData, setNewKeyData] = useState<{
    name: string;
    type: 'public' | 'secret' | 'admin';
    permissions: string[];
    expiresInDays: number;
  }>({
    name: '',
    type: 'secret',
    permissions: DEFAULT_PERMISSIONS_BY_TYPE.secret,
    expiresInDays: 90,
  });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom de la clé est requis',
        variant: 'destructive',
      });
      return;
    }

    if (newKeyData.permissions.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Sélectionnez au moins une permission',
        variant: 'destructive',
      });
      return;
    }

    const result = await createApiKey(
      newKeyData.name,
      newKeyData.type,
      newKeyData.permissions,
      newKeyData.expiresInDays
    );

    if (result.success && result.key) {
      setGeneratedKey(result.key);
      setShowGeneratedKey(true);
      setIsCreateDialogOpen(false);
      
      // Reset form
      setNewKeyData({
        name: '',
        type: 'secret',
        permissions: DEFAULT_PERMISSIONS_BY_TYPE.secret,
        expiresInDays: 90,
      });
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKeyForDelete) return;

    const success = await deleteApiKey(selectedKeyForDelete);
    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedKeyForDelete(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast({
      title: 'Copié !',
      description: 'La clé API a été copiée dans le presse-papier',
    });
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTypeChange = (type: 'public' | 'secret' | 'admin') => {
    setNewKeyData({
      ...newKeyData,
      type,
      permissions: DEFAULT_PERMISSIONS_BY_TYPE[type],
    });
  };

  const togglePermission = (permission: string) => {
    if (newKeyData.permissions.includes(permission)) {
      setNewKeyData({
        ...newKeyData,
        permissions: newKeyData.permissions.filter(p => p !== permission),
      });
    } else {
      setNewKeyData({
        ...newKeyData,
        permissions: [...newKeyData.permissions, permission],
      });
    }
  };

  const getKeyTypeColor = (type: string) => {
    switch (type) {
      case 'public':
        return 'bg-blue-500';
      case 'secret':
        return 'bg-green-500';
      case 'admin':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getKeyTypeLabel = (type: string) => {
    switch (type) {
      case 'public':
        return 'Publique';
      case 'secret':
        return 'Secrète';
      case 'admin':
        return 'Admin';
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clés API</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos clés API pour accéder à l'API FactureX depuis n8n, Discord, ou d'autres applications
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Clé API
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
            <AlertCircle className="mr-2 h-5 w-5" />
            Important
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200">
          <ul className="list-disc list-inside space-y-2">
            <li>Les clés API ne sont affichées qu'une seule fois lors de leur création</li>
            <li>Conservez vos clés en lieu sûr et ne les partagez jamais</li>
            <li>Les clés publiques ont un accès limité (lecture seule des stats)</li>
            <li>Les clés secrètes permettent de lire les données et gérer les webhooks</li>
            <li>Les clés admin ont un accès complet à l'API</li>
          </ul>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Chargement des clés API...
            </CardContent>
          </Card>
        ) : apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune clé API créée</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                Créer votre première clé
              </Button>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{key.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge className={getKeyTypeColor(key.type)}>
                          {getKeyTypeLabel(key.type)}
                        </Badge>
                        <span className="text-xs">
                          {key.key_prefix}...
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedKeyForDelete(key.id);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Créée le</p>
                    <p className="font-medium">
                      {new Date(key.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dernière utilisation</p>
                    <p className="font-medium">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString('fr-FR')
                        : 'Jamais'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expire le</p>
                    <p className="font-medium">
                      {key.expires_at
                        ? new Date(key.expires_at).toLocaleDateString('fr-FR')
                        : 'Jamais'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Permissions</p>
                    <p className="font-medium">{key.permissions.length} permission(s)</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Permissions :</p>
                  <div className="flex flex-wrap gap-2">
                    {key.permissions.map((perm) => (
                      <Badge key={perm} variant="outline">
                        {API_PERMISSIONS[perm as keyof typeof API_PERMISSIONS] || perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer une Nouvelle Clé API</DialogTitle>
            <DialogDescription>
              Configurez votre nouvelle clé API. La clé ne sera affichée qu'une seule fois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la clé *</Label>
              <Input
                id="name"
                placeholder="Ex: n8n Production, Discord Bot, etc."
                value={newKeyData.name}
                onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type de clé *</Label>
              <Select value={newKeyData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Publique (100 req/h) - Lecture seule des stats
                  </SelectItem>
                  <SelectItem value="secret">
                    Secrète (1000 req/h) - Lecture + Webhooks
                  </SelectItem>
                  <SelectItem value="admin">
                    Admin (5000 req/h) - Accès complet
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expiration</Label>
              <Select
                value={newKeyData.expiresInDays.toString()}
                onValueChange={(value) =>
                  setNewKeyData({ ...newKeyData, expiresInDays: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                  <SelectItem value="180">180 jours</SelectItem>
                  <SelectItem value="365">1 an</SelectItem>
                  <SelectItem value="0">Jamais</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permissions *</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(API_PERMISSIONS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={newKeyData.permissions.includes(key)}
                      onCheckedChange={() => togglePermission(key)}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateKey}>Créer la Clé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Key Dialog */}
      <Dialog open={!!generatedKey} onOpenChange={() => setGeneratedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Clé API Créée avec Succès !
            </DialogTitle>
            <DialogDescription>
              Copiez cette clé maintenant. Elle ne sera plus jamais affichée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Votre Clé API</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  type={showGeneratedKey ? 'text' : 'password'}
                  value={generatedKey || ''}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowGeneratedKey(!showGeneratedKey)}
                >
                  {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedKey || '')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copiedKey && (
                <p className="text-sm text-green-600">✓ Clé copiée dans le presse-papier</p>
              )}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Important :</strong> Conservez cette clé en lieu sûr. Elle ne sera plus
                jamais affichée. Si vous la perdez, vous devrez en créer une nouvelle.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setGeneratedKey(null)}>J'ai copié la clé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette clé API ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les applications utilisant cette clé ne
              pourront plus accéder à l'API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className="bg-destructive">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
