import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Webhook, AlertCircle } from 'lucide-react';
import { SettingsTabsLayout } from './SettingsTabsLayout';
import { useNavigate } from 'react-router-dom';

export const SettingsApiWebhooks = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('api-keys');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="mr-2 h-5 w-5" />
          API & Webhooks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsTabsLayout
          tabs={[
            { id: 'api-keys', label: 'Clés API', icon: <Key className="h-4 w-4" />, color: 'text-blue-500' },
            { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="h-4 w-4" />, color: 'text-violet-500' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {/* Clés API */}
          {activeTab === 'api-keys' && (
            <div className="space-y-6 pt-4">
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-900 dark:text-blue-100 text-base">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Gestion des Clés API
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-blue-800 dark:text-blue-200">
                  <p className="mb-4 text-sm">
                    Les clés API vous permettent d'intégrer FactureX avec des outils externes comme n8n, Discord, ou vos propres applications.
                  </p>
                  <Button
                    onClick={() => navigate('/api-keys')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Gérer les Clés API
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documentation API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Endpoints Disponibles</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api-transactions</code> - Récupérer les transactions</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api-clients</code> - Récupérer les clients</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api-factures</code> - Récupérer les factures</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api-colis</code> - Récupérer les colis</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api-stats</code> - Récupérer les statistiques</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">POST /api-webhooks</code> - Gérer les webhooks</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Types de Clés</h3>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <Badge className="bg-blue-500">Public</Badge>
                        <span className="text-sm text-gray-600">100 req/h - Lecture seule des stats</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Badge className="bg-green-500">Secret</Badge>
                        <span className="text-sm text-gray-600">1000 req/h - Lecture + Webhooks</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Badge className="bg-red-500">Admin</Badge>
                        <span className="text-sm text-gray-600">5000 req/h - Accès complet</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Webhooks */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6 pt-4">
              <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center text-purple-900 dark:text-purple-100 text-base">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Gestion des Webhooks
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-purple-800 dark:text-purple-200">
                  <p className="mb-4 text-sm">
                    Les webhooks vous permettent de recevoir des notifications en temps réel lorsque des événements se produisent dans FactureX.
                  </p>
                  <Button
                    onClick={() => navigate('/webhooks')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Webhook className="mr-2 h-4 w-4" />
                    Gérer les Webhooks
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Événements Disponibles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Factures</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li><code className="bg-gray-100 px-2 py-1 rounded">facture.created</code> - Nouvelle facture créée</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">facture.paid</code> - Facture payée</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">facture.cancelled</code> - Facture annulée</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Colis</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li><code className="bg-gray-100 px-2 py-1 rounded">colis.created</code> - Nouveau colis créé</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">colis.status_changed</code> - Changement de statut</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">colis.delivered</code> - Colis livré</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Paiements</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li><code className="bg-gray-100 px-2 py-1 rounded">payment.received</code> - Paiement reçu</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">payment.failed</code> - Échec de paiement</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SettingsTabsLayout>
      </CardContent>
    </Card>
  );
};
