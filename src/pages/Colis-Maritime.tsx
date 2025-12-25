import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ship, Package, Plus, Search, Filter } from 'lucide-react';
import { useColisMaritime } from '@/hooks/useColisMaritime';
import { useContainersMaritime } from '@/hooks/useContainersMaritime';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';

const ColisMaritimePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('colis');
    const { colis, loading: colisLoading } = useColisMaritime();
    const { containers, loading: containersLoading } = useContainersMaritime();
    const [searchTerm, setSearchTerm] = useState('');

    usePageSetup({
        title: 'Fret Maritime',
        subtitle: 'Gestion des expéditions maritimes, CBM et containers'
    });

    const filteredColis = colis.filter(c =>
        c.client?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredContainers = containers.filter(c =>
        c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.transitaire?.nom.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-end">
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filtres
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" />
                            {activeTab === 'colis' ? 'Nouveau Colis' : 'Nouveau Container'}
                        </Button>
                    </div>
                </div>

                {/* Stats Cards Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Colis en Attente</p>
                                    <p className="text-2xl font-bold text-yellow-600">
                                        {colis.filter(c => c.statut === 'Reçu Entrepôt Chine').length}
                                    </p>
                                </div>
                                <Package className="h-8 w-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Volume Total</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {colis.reduce((acc, curr) => acc + (Number(curr.cbm) || 0), 0).toFixed(3)} m³
                                    </p>
                                </div>
                                <Ship className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Containers en Mer</p>
                                    <p className="text-2xl font-bold text-blue-500">
                                        {containers.filter(c => c.statut === 'En transit').length}
                                    </p>
                                </div>
                                <Ship className="h-8 w-8 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Arrivés à Kin</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {containers.filter(c => c.statut === 'Arrivé').length}
                                    </p>
                                </div>
                                <Package className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>


                <Tabs defaultValue="colis" onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="colis">Colis Individuels</TabsTrigger>
                            <TabsTrigger value="containers">Containers</TabsTrigger>
                        </TabsList>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <TabsContent value="colis" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-500" />
                                        Liste des Colis Maritimes ({filteredColis.length})
                                    </CardTitle>
                                </div>
                                <CardDescription>Tous les colis reçus, en attente de chargement ou en transit.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 text-gray-700">
                                            <tr>
                                                <th className="p-4 font-semibold">Date Reçu</th>
                                                <th className="p-4 font-semibold">Client</th>
                                                <th className="p-4 font-semibold">Tracking</th>
                                                <th className="p-4 font-semibold">CBM</th>
                                                <th className="p-4 font-semibold">Container</th>
                                                <th className="p-4 font-semibold">Statut</th>
                                                <th className="p-4 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {colisLoading ? (
                                                <tr><td colSpan={7} className="p-8 text-center">
                                                    <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
                                                </td></tr>
                                            ) : filteredColis.length === 0 ? (
                                                <tr><td colSpan={7} className="p-12 text-center text-gray-500">
                                                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                                    Aucun colis trouvé
                                                </td></tr>
                                            ) : (
                                                filteredColis.map(item => (
                                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="p-4">{item.date_reception_chine ? format(new Date(item.date_reception_chine), 'dd/MM/yyyy') : '-'}</td>
                                                        <td className="p-4 font-medium">
                                                            <div className="flex flex-col">
                                                                <span>{item.client?.nom || 'Inconnu'}</span>
                                                                <span className="text-xs text-gray-500">{item.client?.telephone}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono bg-gray-50/50 rounded">{item.tracking_number || '-'}</td>
                                                        <td className="p-4 font-mono font-bold text-blue-700">{item.cbm} m³</td>
                                                        <td className="p-4">
                                                            {item.container ? (
                                                                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                                                    {item.container.numero}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs italic">Non assigné</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <StatusBadge status={item.statut} />
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <Button variant="ghost" size="sm" className="hover:bg-blue-100 text-blue-600">Détails</Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="containers" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <CardTitle className="flex items-center gap-2">
                                        <Ship className="h-5 w-5 text-blue-500" />
                                        Gestion des Containers ({filteredContainers.length})
                                    </CardTitle>
                                </div>
                                <CardDescription>Suivi des containers groupés et de leurs expéditions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 text-gray-700">
                                            <tr>
                                                <th className="p-4 font-semibold">Numéro</th>
                                                <th className="p-4 font-semibold">Transitaire</th>
                                                <th className="p-4 font-semibold">Départ</th>
                                                <th className="p-4 font-semibold">Arrivée Prévue</th>
                                                <th className="p-4 font-semibold">Statut</th>
                                                <th className="p-4 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {containersLoading ? (
                                                <tr><td colSpan={6} className="p-8 text-center">
                                                    <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
                                                </td></tr>
                                            ) : filteredContainers.length === 0 ? (
                                                <tr><td colSpan={6} className="p-12 text-center text-gray-500">
                                                    <Ship className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                                    Aucun container trouvé
                                                </td></tr>
                                            ) : (
                                                filteredContainers.map(container => (
                                                    <tr key={container.id} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="p-4 font-bold font-mono text-blue-700">{container.numero}</td>
                                                        <td className="p-4 font-medium">{container.transitaire?.nom || '-'}</td>
                                                        <td className="p-4">{container.date_depart ? format(new Date(container.date_depart), 'dd/MM/yyyy') : '-'}</td>
                                                        <td className="p-4">{container.date_arrivee_prevue ? format(new Date(container.date_arrivee_prevue), 'dd/MM/yyyy') : '-'}</td>
                                                        <td className="p-4">
                                                            <StatusBadge status={container.statut} />
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <Button variant="ghost" size="sm" className="hover:bg-blue-100 text-blue-600">Gérer</Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    let classes = 'bg-gray-100 text-gray-800';
    if (status === 'Arrivé' || status === 'Livré') classes = 'bg-green-100 text-green-800';
    if (status === 'En transit' || status === 'En Mer') classes = 'bg-blue-100 text-blue-800';
    if (status === 'En préparation' || status === 'Reçu Entrepôt Chine') classes = 'bg-yellow-100 text-yellow-800';

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes.replace('bg-', 'bg-opacity-10 border-')}`}>
            {status}
        </span>
    );
};

export default ColisMaritimePage;
