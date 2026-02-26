import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { Input } from '@/components/ui/input';
import { Ship, Package, Plus, Search, Filter } from 'lucide-react';
import { useColisMaritime } from '@/hooks/useColisMaritime';
import { useContainersMaritime } from '@/hooks/useContainersMaritime';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';
import { UnifiedDataTable } from '@/components/ui/unified-data-table';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { ColumnSelector, ColumnConfig } from '@/components/ui/column-selector';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { ColisMaritimeDialog } from '@/components/colis-maritime/ColisMaritimeDialog';
import { ContainerMaritimeDialog } from '@/components/colis-maritime/ContainerMaritimeDialog';
import { ColisMaritime } from '@/hooks/useColisMaritime';
import { ContainerMaritime } from '@/hooks/useContainersMaritime';

const ColisMaritimePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('colis');
    const {
        colis,
        loading: colisLoading,
        createColis,
        updateColis,
        fetchColis // Import fetchColis to manually refresh if needed
    } = useColisMaritime();
    const {
        containers,
        loading: containersLoading,
        createContainer,
        updateContainer,
        fetchContainers
    } = useContainersMaritime();

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards' | 'auto'>('auto');
    const [colisColumnsConfig, setColisColumnsConfig] = useState<Record<string, boolean>>({});
    const [containerColumnsConfig, setContainerColumnsConfig] = useState<Record<string, boolean>>({});
    const [colisFilter, setColisFilter] = useState('all');
    const [containerFilter, setContainerFilter] = useState('all');
    const isMobile = useIsMobile();

    // Dialog states
    const [isColisDialogOpen, setIsColisDialogOpen] = useState(false);
    const [isContainerDialogOpen, setIsContainerDialogOpen] = useState(false);
    const [selectedColis, setSelectedColis] = useState<ColisMaritime | null>(null);
    const [selectedContainer, setSelectedContainer] = useState<ContainerMaritime | null>(null);

    usePageSetup({
        title: 'Fret Maritime',
        subtitle: 'Gestion des expéditions maritimes, CBM et containers'
    });

    const filteredColis = colis.filter(c => {
        const matchesSearch = c.client?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (colisFilter === 'recu') matchesStatus = c.statut === 'Reçu Entrepôt Chine';
        if (colisFilter === 'transit') matchesStatus = c.statut === 'En transit' || c.statut === 'En Mer';
        if (colisFilter === 'arrive') matchesStatus = c.statut === 'Arrivé' || c.statut === 'Livré';

        return matchesSearch && matchesStatus;
    });

    const filteredContainers = containers.filter(c => {
        const matchesSearch = c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.transitaire?.nom.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (containerFilter === 'prep') matchesStatus = c.statut === 'En préparation';
        if (containerFilter === 'mer') matchesStatus = c.statut === 'En transit' || c.statut === 'En Mer';
        if (containerFilter === 'arrive') matchesStatus = c.statut === 'Arrivé';

        return matchesSearch && matchesStatus;
    });

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-end">
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filtres
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                if (activeTab === 'colis') {
                                    setSelectedColis(null);
                                    setIsColisDialogOpen(true);
                                } else {
                                    setSelectedContainer(null);
                                    setIsContainerDialogOpen(true);
                                }
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {activeTab === 'colis' ? 'Nouveau Colis' : 'Nouveau Container'}
                        </Button>
                    </div>
                </div>

                {/* Stats Cards - FreshCart style */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <KpiCard title="Colis en attente" value={colis.filter(c => c.statut === 'Reçu Entrepôt Chine').length} icon={Package} iconColor="#f59e0b" iconBg="#fef3c7" />
                    <KpiCard title="Volume total (m³)" value={colis.reduce((acc, curr) => acc + (Number(curr.cbm) || 0), 0).toFixed(2)} icon={Ship} iconColor="#3b82f6" iconBg="#dbeafe" />
                    <KpiCard title="Containers en mer" value={containers.filter(c => c.statut === 'En transit').length} icon={Ship} iconColor="#6366f1" iconBg="#e0e7ff" />
                    <KpiCard title="Arrivés à Kin" value={containers.filter(c => c.statut === 'Arrivé').length} icon={Package} iconColor="#21ac74" iconBg="#dcfce7" />
                </div>


                <Tabs defaultValue="colis" onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
                        <TabsList className="inline-flex bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-xl gap-1">
                            <TabsTrigger
                                value="colis"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    text-gray-500 dark:text-gray-400
                                    hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50
                                    data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/20"
                            >
                                <Package className="h-4 w-4" />
                                <span className="hidden sm:inline">Colis Individuels</span>
                                <span className="sm:hidden">Colis</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="containers"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    text-gray-500 dark:text-gray-400
                                    hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50
                                    data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/20"
                            >
                                <Ship className="h-4 w-4" />
                                Containers
                            </TabsTrigger>
                        </TabsList>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-gray-50 dark:bg-gray-800"
                            />
                        </div>
                    </div>

                    <TabsContent value="colis" className="space-y-4">
                        <FilterTabs
                            tabs={[
                                { id: 'all', label: 'Tous', count: colis.length },
                                { id: 'recu', label: 'Reçu Chine', count: colis.filter(c => c.statut === 'Reçu Entrepôt Chine').length },
                                { id: 'transit', label: 'En Transit', count: colis.filter(c => c.statut === 'En transit' || c.statut === 'En Mer').length },
                                { id: 'arrive', label: 'Arrivé', count: colis.filter(c => c.statut === 'Arrivé' || c.statut === 'Livré').length },
                            ]}
                            activeTab={colisFilter}
                            onTabChange={setColisFilter}
                        />
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div className="flex flex-col gap-1">
                                        <CardTitle className="flex items-center gap-2">
                                            <Package className="h-5 w-5 text-blue-500" />
                                            Liste des Colis Maritimes ({filteredColis.length})
                                        </CardTitle>
                                        <CardDescription>Tous les colis reçus, en attente de chargement ou en transit.</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <ColumnSelector
                                            columns={COLIS_COLUMNS(null, null).map(c => ({
                                                key: c.key,
                                                label: c.title,
                                                visible: colisColumnsConfig[c.key] !== false
                                            }))}
                                            onColumnsChange={(cols) => setColisColumnsConfig(cols.reduce((acc, c) => ({ ...acc, [c.key]: c.visible }), {}))}
                                        />
                                        <ExportDropdown
                                            onExport={() => { }}
                                            disabled={filteredColis.length === 0}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <UnifiedDataTable
                                    data={filteredColis}
                                    columns={COLIS_COLUMNS(setSelectedColis, setIsColisDialogOpen).filter(c => colisColumnsConfig[c.key] !== false)}
                                    loading={colisLoading}
                                    viewMode={viewMode}
                                    onViewModeChange={setViewMode}
                                    emptyMessage="Aucun colis trouvé"
                                    emptySubMessage="Essayez de modifier vos filtres"
                                    cardConfig={{
                                        titleKey: 'tracking_number',
                                        subtitleKey: 'client.nom',
                                        badgeKey: 'statut',
                                        badgeRender: (date) => <StatusBadge status={date.statut} />,
                                        infoFields: [
                                            { key: 'cbm', label: 'CBM', render: (val) => `${val} m³` },
                                            { key: 'container.numero', label: 'Container' }
                                        ]
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="containers" className="space-y-4">
                        <FilterTabs
                            tabs={[
                                { id: 'all', label: 'Tous', count: containers.length },
                                { id: 'prep', label: 'En préparation', count: containers.filter(c => c.statut === 'En préparation').length },
                                { id: 'mer', label: 'En Mer', count: containers.filter(c => c.statut === 'En transit' || c.statut === 'En Mer').length },
                                { id: 'arrive', label: 'Arrivé', count: containers.filter(c => c.statut === 'Arrivé').length },
                            ]}
                            activeTab={containerFilter}
                            onTabChange={setContainerFilter}
                        />
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div className="flex flex-col gap-1">
                                        <CardTitle className="flex items-center gap-2">
                                            <Ship className="h-5 w-5 text-blue-500" />
                                            Gestion des Containers ({filteredContainers.length})
                                        </CardTitle>
                                        <CardDescription>Suivi des containers groupés et de leurs expéditions.</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <ColumnSelector
                                            columns={CONTAINER_COLUMNS(null, null).map(c => ({
                                                key: c.key,
                                                label: c.title,
                                                visible: containerColumnsConfig[c.key] !== false
                                            }))}
                                            onColumnsChange={(cols) => setContainerColumnsConfig(cols.reduce((acc, c) => ({ ...acc, [c.key]: c.visible }), {}))}
                                        />
                                        <ExportDropdown
                                            onExport={() => { }}
                                            disabled={filteredContainers.length === 0}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <UnifiedDataTable
                                    data={filteredContainers}
                                    columns={CONTAINER_COLUMNS(setSelectedContainer, setIsContainerDialogOpen).filter(c => containerColumnsConfig[c.key] !== false)}
                                    loading={containersLoading}
                                    viewMode={viewMode}
                                    onViewModeChange={setViewMode}
                                    emptyMessage="Aucun container trouvé"
                                    emptySubMessage="Aucun container ne correspond à votre recherche"
                                    cardConfig={{
                                        titleKey: 'numero',
                                        subtitleKey: 'transitaire.nom',
                                        badgeKey: 'statut',
                                        badgeRender: (date) => <StatusBadge status={date.statut} />,
                                        infoFields: [
                                            { key: 'date_depart', label: 'Départ', render: (val) => val ? format(new Date(val), 'dd/MM/yyyy') : '-' },
                                            { key: 'date_arrivee_prevue', label: 'Arrivée', render: (val) => val ? format(new Date(val), 'dd/MM/yyyy') : '-' }
                                        ]
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <ColisMaritimeDialog
                open={isColisDialogOpen}
                onOpenChange={setIsColisDialogOpen}
                initialData={selectedColis}
                onSubmit={async (data) => {
                    if (selectedColis) {
                        await updateColis(selectedColis.id, data);
                    } else {
                        await createColis(data);
                    }
                    setIsColisDialogOpen(false); // Ensure close
                }}
            />

            <ContainerMaritimeDialog
                open={isContainerDialogOpen}
                onOpenChange={setIsContainerDialogOpen}
                initialData={selectedContainer}
                onSubmit={async (data) => {
                    if (selectedContainer) {
                        await updateContainer(selectedContainer.id, data);
                    } else {
                        await createContainer(data);
                    }
                    setIsContainerDialogOpen(false); // Ensure close
                }}
            />
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



const COLIS_COLUMNS = (setSelectedColis: any, setIsColisDialogOpen: any) => [
    {
        key: 'date_reception_chine',
        title: 'Date Reçu',
        sortable: true,
        render: (value: any) => value ? format(new Date(value), 'dd/MM/yyyy') : '-'
    },
    {
        key: 'client',
        title: 'Client',
        sortable: true,
        render: (value: any, item: any) => (
            <div className="flex flex-col">
                <span>{item.client?.nom || 'Inconnu'}</span>
                <span className="text-xs text-gray-500">{item.client?.telephone}</span>
            </div>
        )
    },
    {
        key: 'tracking_number',
        title: 'Tracking',
        sortable: true,
        render: (value: any) => <span className="font-mono bg-gray-50/50 rounded px-2 py-1">{value || '-'}</span>
    },
    {
        key: 'cbm',
        title: 'CBM',
        sortable: true,
        render: (value: any) => <span className="font-mono font-bold text-blue-700">{value} m³</span>
    },
    {
        key: 'container',
        title: 'Container',
        sortable: true,
        render: (value: any) => value ? (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                {value.numero}
            </Badge>
        ) : (
            <span className="text-gray-400 text-xs italic">Non assigné</span>
        )
    },
    {
        key: 'statut',
        title: 'Statut',
        sortable: true,
        render: (value: any) => <StatusBadge status={value} />
    },
    {
        key: 'actions',
        title: 'Actions',
        align: 'right' as const,
        render: (_: any, item: any) => (
            <Button
                variant="ghost"
                size="sm"
                className="hover:bg-blue-100 text-blue-600"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedColis(item);
                    setIsColisDialogOpen(true);
                }}
            >
                Détails
            </Button>
        )
    }
];

const CONTAINER_COLUMNS = (setSelectedContainer: any, setIsContainerDialogOpen: any) => [
    {
        key: 'numero',
        title: 'Numéro',
        sortable: true,
        render: (value: any) => <span className="font-bold font-mono text-blue-700">{value}</span>
    },
    {
        key: 'transitaire.nom',
        title: 'Transitaire',
        sortable: true,
        render: (value: any, item: any) => item.transitaire?.nom || '-'
    },
    {
        key: 'date_depart',
        title: 'Départ',
        sortable: true,
        render: (value: any) => value ? format(new Date(value), 'dd/MM/yyyy') : '-'
    },
    {
        key: 'date_arrivee_prevue',
        title: 'Arrivée Prévue',
        sortable: true,
        render: (value: any) => value ? format(new Date(value), 'dd/MM/yyyy') : '-'
    },
    {
        key: 'statut',
        title: 'Statut',
        sortable: true,
        render: (value: any) => <StatusBadge status={value} />
    },
    {
        key: 'actions',
        title: 'Actions',
        align: 'right' as const,
        render: (_: any, item: any) => (
            <Button
                variant="ghost"
                size="sm"
                className="hover:bg-blue-100 text-blue-600"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContainer(item);
                    setIsContainerDialogOpen(true);
                }}
            >
                Gérer
            </Button>
        )
    }
];

export default ColisMaritimePage;
