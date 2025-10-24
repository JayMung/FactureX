import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  FileText,
  DollarSign,
  Eye,
  Calendar,
  RefreshCw,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Facture } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

interface ClientFacturesTabProps {
  clientId: string;
  clientName: string;
}

const ClientFacturesTab: React.FC<ClientFacturesTabProps> = ({ clientId, clientName }) => {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statutFilter, setStatutFilter] = useState('all');

  useEffect(() => {
    fetchFactures();
  }, [clientId, typeFilter, statutFilter]);

  const fetchFactures = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('factures')
        .select('*')
        .eq('client_id', clientId)
        .order('date_emission', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }
      if (statutFilter !== 'all') {
        query = query.eq('statut', statutFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFactures(data || []);
    } catch (error: any) {
      console.error('Error fetching factures:', error);
      showError('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, devise: string) => {
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return devise === 'USD' ? `$${formatted}` : `${formatted} FC`;
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: any; className: string; label: string }> = {
      brouillon: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800', label: 'Brouillon' },
      en_attente: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      validee: { variant: 'default' as const, className: 'bg-emerald-600 text-white', label: 'Validée' },
      annulee: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800', label: 'Annulée' }
    };
    
    const config = variants[statut] || variants.brouillon;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredFactures = factures.filter(facture => 
    facture.facture_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facture.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUSD = filteredFactures
    .filter(f => f.devise === 'USD')
    .reduce((sum, f) => sum + f.total_general, 0);

  const totalCDF = filteredFactures
    .filter(f => f.devise === 'CDF')
    .reduce((sum, f) => sum + f.total_general, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Factures</p>
                <p className="text-2xl font-bold text-emerald-600">{filteredFactures.length}</p>
              </div>
              <FileText className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total USD</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total CDF</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalCDF.toLocaleString('fr-FR')} FC
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par numéro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="devis">Devis</SelectItem>
            <SelectItem value="facture">Facture</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statutFilter} onValueChange={setStatutFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="validee">Validée</SelectItem>
            <SelectItem value="annulee">Annulée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des factures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Factures de {clientName}</span>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle facture
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFactures.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune facture trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFactures.map((facture) => (
                <div key={facture.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{facture.facture_number}</p>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {facture.type === 'devis' ? '📄 Devis' : '📋 Facture'}
                      </Badge>
                      {getStatutBadge(facture.statut)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-emerald-600">
                        {formatCurrency(facture.total_general, facture.devise)}
                      </p>
                      <p className="text-sm text-gray-500">{facture.devise}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {facture.type === 'devis' && facture.statut === 'brouillon' && (
                        <Button variant="ghost" size="sm" className="text-emerald-600">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientFacturesTab;