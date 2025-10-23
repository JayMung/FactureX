import React from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  BellOff, 
  RefreshCw,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Key,
  Settings,
  Users,
  Receipt,
  User,
  Activity
} from 'lucide-react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { cn } from '@/lib/utils';

const NotificationSettings: React.FC = () => {
  usePageSetup({
    title: 'Paramètres de Notifications',
    subtitle: 'Personnalisez vos préférences de notifications'
  });

  const {
    preferences,
    loading,
    saving,
    updatePreferences,
    resetToDefaults,
    requestBrowserNotificationPermission
  } = useNotificationPreferences();

  const handleToggle = async (key: string, value: boolean) => {
    await updatePreferences({ [key]: value } as any);
  };

  const handleEnableBrowserNotifications = async () => {
    await requestBrowserNotificationPermission();
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Paramètres de Notifications</h1>
              <p className="text-gray-500">Chargement...</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!preferences) {
    return (
      <Layout>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Erreur lors du chargement des préférences</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres de Notifications</h1>
            <p className="text-gray-500">
              Personnalisez comment et quand vous souhaitez être notifié
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              disabled={saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Statut global */}
        <Card className={cn(
          "border-2",
          preferences.enable_notifications ? "border-green-200 bg-green-50" : "border-gray-200"
        )}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {preferences.enable_notifications ? (
                  <div className="p-3 bg-green-100 rounded-full">
                    <Bell className="h-6 w-6 text-green-600" />
                  </div>
                ) : (
                  <div className="p-3 bg-gray-100 rounded-full">
                    <BellOff className="h-6 w-6 text-gray-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Notifications {preferences.enable_notifications ? 'Activées' : 'Désactivées'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {preferences.enable_notifications 
                      ? 'Vous recevez des notifications pour les activités sélectionnées'
                      : 'Toutes les notifications sont désactivées'}
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.enable_notifications}
                onCheckedChange={(checked) => handleToggle('enable_notifications', checked)}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications du navigateur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications Push</span>
              </CardTitle>
              <CardDescription>
                Recevez des notifications même lorsque l'application n'est pas ouverte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="browser-notifications" className="font-medium">
                    Notifications du Navigateur
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Activez les notifications push de votre navigateur
                  </p>
                </div>
                <Switch
                  id="browser-notifications"
                  checked={preferences.enable_browser_notifications}
                  onCheckedChange={handleEnableBrowserNotifications}
                  disabled={saving || !preferences.enable_notifications}
                />
              </div>
              
              {!preferences.enable_browser_notifications && preferences.enable_notifications && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 Les notifications du navigateur vous permettent de rester informé même lorsque l'application est fermée
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Filtres</span>
              </CardTitle>
              <CardDescription>
                Affinez les notifications que vous recevez
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="only-own" className="font-medium">
                    Mes activités uniquement
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Ne notifier que pour vos propres actions
                  </p>
                </div>
                <Switch
                  id="only-own"
                  checked={preferences.notify_only_own_activities}
                  onCheckedChange={(checked) => handleToggle('notify_only_own_activities', checked)}
                  disabled={saving || !preferences.enable_notifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="important-only" className="font-medium">
                    Activités importantes uniquement
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Réduire le bruit en ne notifiant que les événements importants
                  </p>
                </div>
                <Switch
                  id="important-only"
                  checked={preferences.notify_only_important}
                  onCheckedChange={(checked) => handleToggle('notify_only_important', checked)}
                  disabled={saving || !preferences.enable_notifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Types d'actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Types d'Actions</span>
              </CardTitle>
              <CardDescription>
                Choisissez les types d'actions à notifier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationToggle
                icon={<Plus className="h-4 w-4 text-green-600" />}
                label="Créations"
                description="Nouveaux clients, transactions, etc."
                checked={preferences.notify_on_creation}
                onChange={(checked) => handleToggle('notify_on_creation', checked)}
                disabled={saving || !preferences.enable_notifications}
                color="green"
              />

              <NotificationToggle
                icon={<Edit className="h-4 w-4 text-yellow-600" />}
                label="Modifications"
                description="Mises à jour d'éléments existants"
                checked={preferences.notify_on_modification}
                onChange={(checked) => handleToggle('notify_on_modification', checked)}
                disabled={saving || !preferences.enable_notifications}
                color="yellow"
              />

              <NotificationToggle
                icon={<Trash2 className="h-4 w-4 text-red-600" />}
                label="Suppressions"
                description="Éléments supprimés"
                checked={preferences.notify_on_deletion}
                onChange={(checked) => handleToggle('notify_on_deletion', checked)}
                disabled={saving || !preferences.enable_notifications}
                color="red"
              />

              <NotificationToggle
                icon={<Key className="h-4 w-4 text-purple-600" />}
                label="Authentification"
                description="Connexions et déconnexions"
                checked={preferences.notify_on_auth}
                onChange={(checked) => handleToggle('notify_on_auth', checked)}
                disabled={saving || !preferences.enable_notifications}
                color="purple"
              />

              <NotificationToggle
                icon={<Settings className="h-4 w-4 text-gray-600" />}
                label="Paramètres"
                description="Modifications de configuration"
                checked={preferences.notify_on_settings}
                onChange={(checked) => handleToggle('notify_on_settings', checked)}
                disabled={saving || !preferences.enable_notifications}
                color="gray"
              />
            </CardContent>
          </Card>

          {/* Types d'entités */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Types d'Entités</span>
              </CardTitle>
              <CardDescription>
                Choisissez les entités à surveiller
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationToggle
                icon={<Users className="h-4 w-4 text-blue-600" />}
                label="Clients"
                description="Activités liées aux clients"
                checked={preferences.notify_on_client_activity}
                onChange={(checked) => handleToggle('notify_on_client_activity', checked)}
                disabled={saving || !preferences.enable_notifications}
                color="blue"
              />

              <NotificationToggle
                icon={<Receipt className="h-4 w-4 text-emerald-600" />}
                label="Transactions"
                description="Activités liées aux transactions"
                checked={preferences.notify_on_transaction_activity}
                onChange={(checked) => handleToggle('notify_on_transaction_activity', checked)}
                disabled={saving || !preferences.enable_notifications}
                color="emerald"
              />

              <NotificationToggle
                icon={<User className="h-4 w-4 text-purple-600" />}
                label="Utilisateurs"
                description="Activités liées aux utilisateurs"
                checked={preferences.notify_on_user_activity}
                onChange={(checked) => handleToggle('notify_on_user_activity', checked)}
                disabled={saving || !preferences.enable_notifications}
                color="purple"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

interface NotificationToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  color: string;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
  color
}) => {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border transition-colors",
      checked ? `bg-${color}-50 border-${color}-200` : "bg-gray-50 border-gray-200"
    )}>
      <div className="flex items-center space-x-3 flex-1">
        <div className={cn(
          "p-2 rounded-lg",
          checked ? `bg-${color}-100` : "bg-white"
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <Label className="font-medium text-gray-900 cursor-pointer">
            {label}
          </Label>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};

export default NotificationSettings;
