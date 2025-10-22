"use client";

import { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  CreditCard, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Smartphone,
  Globe,
  HelpCircle,
  Menu,
  X,
  Home,
  LogOut
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface UserProfile {
  id: string;
  email: string;
  user_metadata?: any;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  icon?: string;
  description?: string;
}

interface SettingsOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const Settings = () => {
  usePageSetup({
    title: 'Paramètres',
    subtitle: 'Configurez les préférences de votre application'
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser({
            id: user.id,
            email: user.email || '',
            user_metadata: user.user_metadata
          });
          
          // Fetch profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name');
      
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const tabs: SettingsOption[] = [
    {
      id: 'profile',
      label: 'Profil',
      icon: <UserIcon className="w-4 h-4" />,
      description: 'Informations personnelles et préférences'
    },
    {
      id: 'payment-methods',
      label: 'Moyens de paiement',
      icon: <CreditCard className="w-4 h-4" />,
      description: 'Gérer les modes de paiement disponibles'
    },
    {
      id: 'general',
      label: 'Général',
      icon: <SettingsIcon className="w-4 h-4" />,
      description: 'Configuration générale de l\'application'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      description: 'Préférences de notification et alertes'
    },
    {
      id: 'security',
      label: 'Sécurité',
      icon: <Shield className="w-4 h-4" />,
      description: 'Mot de passe et authentification'
    },
    {
      id: 'devices',
      label: 'Appareils',
      icon: <Smartphone className="w-4 h-4" />,
      description: 'Gérer les appareils connectés'
    },
    {
      id: 'language',
      label: 'Langue',
      icon: <Globe className="w-4 h-4" />,
      description: 'Préférences linguistiques et régionales'
    },
    {
      id: 'help',
      label: 'Aide',
      icon: <HelpCircle className="w-4 h-4" />,
      description: 'Centre d\'aide et support'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Profil</h2>
              <p className="text-gray-600">Gérez vos informations personnelles et vos préférences</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations personnelles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    defaultValue={profile?.first_name || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    defaultValue={profile?.last_name || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    value={user?.email || ''}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    value={profile?.role || ''}
                    disabled
                  />
                </div>
              </div>
              <div className="mt-6">
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors">
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          </div>
        );

      case 'payment-methods':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Moyens de paiement</h2>
              <p className="text-gray-600">Configurez les modes de paiement acceptés dans votre système</p>
            </div>
            
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Liste des moyens de paiement</h3>
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors">
                    Ajouter un moyen de paiement
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentMethods.map((method) => (
                      <tr key={method.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {method.icon && (
                              <span className="mr-3 text-xl">{method.icon}</span>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {method.name}
                              </div>
                              {method.description && (
                                <div className="text-sm text-gray-500">
                                  {method.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{method.code}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            method.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {method.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-emerald-600 hover:text-emerald-900 mr-3">
                            Modifier
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {paymentMethods.length === 0 && (
                  <div className="text-center py-12">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Aucun moyen de paiement
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Commencez par ajouter un moyen de paiement.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <p className="text-gray-600">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-12">
                <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Cette section est en cours de développement
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Les fonctionnalités pour cette section seront bientôt disponibles.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Settings Navigation in Header - Dropdown Menu */}
      <div className="flex justify-end mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {tabs.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  cursor-pointer
                  ${activeTab === tab.id 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  {tab.icon}
                  <div>
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          <div className="space-y-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Settings;