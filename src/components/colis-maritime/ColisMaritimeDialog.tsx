import React, { useEffect } from 'react';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useContainersMaritime } from '@/hooks/useContainersMaritime';
import { ColisMaritime } from '@/hooks/useColisMaritime';

const colisSchema = z.object({
    client_id: z.string().min(1, 'Le client est requis'),
    tracking_number: z.string().optional(),
    description: z.string().optional(),
    cbm: z.coerce.number().min(0, 'Le CBM doit être positif'),
    poids: z.coerce.number().min(0, 'Le poids doit être positif'),
    quantite: z.coerce.number().int().min(1, 'La quantité doit être au moins 1'),
    container_id: z.string().optional(),
    statut: z.string().min(1, 'Le statut est requis'),
    date_reception_chine: z.string().optional(),
    notes: z.string().optional(),
});

type ColisFormValues = z.infer<typeof colisSchema>;

interface ColisMaritimeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<ColisMaritime>) => Promise<any>;
    initialData?: ColisMaritime | null;
}

export const ColisMaritimeDialog: React.FC<ColisMaritimeDialogProps> = ({
    open,
    onOpenChange,
    onSubmit,
    initialData
}) => {
    const { clients } = useClients(); // Assuming this hook exists and returns { clients }
    const { containers } = useContainersMaritime();

    const form = useForm<ColisFormValues>({
        resolver: zodResolver(colisSchema),
        defaultValues: {
            cbm: 0,
            poids: 0,
            quantite: 1,
            statut: 'Reçu Entrepôt Chine',
        }
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                client_id: initialData.client_id,
                tracking_number: initialData.tracking_number || '',
                description: initialData.description || '',
                cbm: initialData.cbm || 0,
                poids: initialData.poids || 0,
                quantite: initialData.quantite || 1,
                container_id: initialData.container_id || undefined,
                statut: initialData.statut,
                date_reception_chine: initialData.date_reception_chine ? initialData.date_reception_chine.split('T')[0] : '',
                notes: initialData.notes || '',
            });
        } else {
            form.reset({
                cbm: 0,
                poids: 0,
                quantite: 1,
                statut: 'Reçu Entrepôt Chine',
                date_reception_chine: new Date().toISOString().split('T')[0],
            });
        }
    }, [initialData, form, open]);

    const handleSubmit = async (values: ColisFormValues) => {
        await onSubmit({
            ...values,
            client_id: values.client_id,
            container_id: values.container_id === 'none' ? null : values.container_id || null, // Handle explicitly
            tracking_number: values.tracking_number || null,
            description: values.description || null,
            date_reception_chine: values.date_reception_chine || null,
            notes: values.notes || null,
        });
        onOpenChange(false);
    };

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Modifier le Colis' : 'Nouveau Colis Maritime'}</DialogTitle>
                    <DialogDescription>
                        Remplissez les détails du colis maritime.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">



                        {/* Client Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="client_id">Client</Label>
                            <ClientCombobox
                                clients={clients}
                                value={form.watch('client_id')}
                                onValueChange={(val) => form.setValue('client_id', val)}
                                placeholder="Rechercher un client..."
                                emptyMessage="Aucun client trouvé."
                            />
                            {form.formState.errors.client_id && (
                                <p className="text-sm text-red-500">{form.formState.errors.client_id.message}</p>
                            )}
                        </div>

                        {/* Tracking Number */}
                        <div className="space-y-2">
                            <Label htmlFor="tracking_number">Numéro de Tracking</Label>
                            <Input {...form.register('tracking_number')} placeholder="Ex: MC123456789" />
                        </div>

                        {/* Container Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="container_id">Container</Label>
                            <Select
                                onValueChange={(val) => form.setValue('container_id', val)}
                                value={form.watch('container_id') || 'none'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Assigner à un container (Optionnel)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucun container</SelectItem>
                                    {containers.map((container) => (
                                        <SelectItem key={container.id} value={container.id}>
                                            {container.numero} ({container.statut})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Statut */}
                        <div className="space-y-2">
                            <Label htmlFor="statut">Statut</Label>
                            <Select
                                onValueChange={(val) => form.setValue('statut', val)}
                                value={form.watch('statut')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Reçu Entrepôt Chine">Reçu Entrepôt Chine</SelectItem>
                                    <SelectItem value="En transit">En transit</SelectItem>
                                    <SelectItem value="En Mer">En Mer</SelectItem>
                                    <SelectItem value="Arrivé">Arrivé</SelectItem>
                                    <SelectItem value="Livré">Livré</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* CBM */}
                        <div className="space-y-2">
                            <Label htmlFor="cbm">Volume (CBM)</Label>
                            <Input type="number" step="0.01" {...form.register('cbm')} />
                            {form.formState.errors.cbm && <p className="text-sm text-red-500">{form.formState.errors.cbm.message}</p>}
                        </div>

                        {/* Poids */}
                        <div className="space-y-2">
                            <Label htmlFor="poids">Poids (kg)</Label>
                            <Input type="number" step="0.1" {...form.register('poids')} />
                            {form.formState.errors.poids && <p className="text-sm text-red-500">{form.formState.errors.poids.message}</p>}
                        </div>

                        {/* Quantité */}
                        <div className="space-y-2">
                            <Label htmlFor="quantite">Quantité (Colis)</Label>
                            <Input type="number" step="1" {...form.register('quantite')} />
                            {form.formState.errors.quantite && <p className="text-sm text-red-500">{form.formState.errors.quantite.message}</p>}
                        </div>

                        {/* Date Réception */}
                        <div className="space-y-2">
                            <Label htmlFor="date_reception_chine">Date Réception Chine</Label>
                            <Input type="date" {...form.register('date_reception_chine')} />
                        </div>

                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description marchandise</Label>
                        <Input {...form.register('description')} placeholder="Ex: Assortiment vêtements" />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes internes</Label>
                        <Textarea {...form.register('notes')} placeholder="Notes supplémentaires..." />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? 'Mettre à jour' : 'Créer Colis'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
