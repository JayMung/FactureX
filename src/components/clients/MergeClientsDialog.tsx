import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, ArrowRight, User, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Client {
    id: string;
    nom: string;
    telephone: string | null;
    ville: string | null;
}

interface MergeClientsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientsToMerge: string[]; // Two IDs
    onSuccess: () => void;
}

const MergeClientsDialog: React.FC<MergeClientsDialogProps> = ({
    open,
    onOpenChange,
    clientsToMerge,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState<Client[]>([]);
    const [masterIndex, setMasterIndex] = useState<number>(0);

    useEffect(() => {
        if (open && clientsToMerge.length === 2) {
            fetchClientDetails();
        }
    }, [open, clientsToMerge]);

    const fetchClientDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .in('id', clientsToMerge);

            if (error) throw error;
            setDetails(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error("Erreur lors de la récupération des infos clients");
        } finally {
            setLoading(false);
        }
    };

    const handleMerge = async () => {
        const master = details[masterIndex];
        const secondary = details[1 - masterIndex];

        if (!master || !secondary) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('merge_clients_secure', {
                p_master_id: master.id,
                p_secondary_id: secondary.id
            });

            if (error) throw error;

            toast.success("Fusion réussie !");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Merge error:', error);
            toast.error(error.message || "Erreur lors de la fusion");
        } finally {
            setLoading(false);
        }
    };

    if (details.length < 2 && open && !loading) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <ArrowRight className="h-5 w-5 text-emerald-600" />
                        Fusionner les fiches clients
                    </DialogTitle>
                    <DialogDescription>
                        Choisissez la fiche qui sera conservée comme profil principal. Toutes les transactions, factures et colis du compte secondaire seront transférés vers le profil principal.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="font-bold">Action irréversible</AlertTitle>
                        <AlertDescription className="text-sm">
                            Le compte secondaire sera définitivement supprimé après le transfert des données.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4">
                        {details.map((client, index) => (
                            <div
                                key={client.id}
                                onClick={() => setMasterIndex(index)}
                                className={cn(
                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                    masterIndex === index
                                        ? "border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-500/20"
                                        : "border-gray-100 bg-gray-50/50 hover:bg-gray-50"
                                )}
                            >
                                {masterIndex === index && (
                                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                                        MASTER
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <User className={cn("h-4 w-4", masterIndex === index ? "text-emerald-600" : "text-gray-400")} />
                                        <span className="font-bold text-sm truncate">{client.nom}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Phone className="h-3 w-3" />
                                        <span>{client.telephone || 'Non renseigné'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <MapPin className="h-3 w-3" />
                                        <span>{client.ville || 'Non renseigné'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                <p className="font-medium mb-1">Que se passe-t-il pendant la fusion ?</p>
                                <ul className="list-disc ml-4 space-y-1">
                                    <li>Les transactions du client secondaire sont réaffectées au master.</li>
                                    <li>Les factures et documents sont rattachés au nouveau profil.</li>
                                    <li>Le solde total est recalculé automatiquement.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleMerge}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                    >
                        {loading ? "Fusion en cours..." : "Confirmer la fusion"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MergeClientsDialog;
