import React, { useEffect } from 'react';
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
import { useTransitaires } from '@/hooks/useTransitaires';
import { ContainerMaritime } from '@/hooks/useContainersMaritime';

const containerSchema = z.object({
    numero: z.string().min(1, 'Le numéro est requis'),
    transitaire_id: z.string().optional(),
    statut: z.string().min(1, 'Le statut est requis'),
    date_depart: z.string().optional(),
    date_arrivee_prevue: z.string().optional(),
    date_arrivee_effective: z.string().optional(),
    bateau: z.string().optional(),
    numero_voyage: z.string().optional(),
    notes: z.string().optional(),
});

type ContainerFormValues = z.infer<typeof containerSchema>;

interface ContainerMaritimeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<ContainerMaritime>) => Promise<any>;
    initialData?: ContainerMaritime | null;
}

export const ContainerMaritimeDialog: React.FC<ContainerMaritimeDialogProps> = ({
    open,
    onOpenChange,
    onSubmit,
    initialData
}) => {
    const { transitaires } = useTransitaires();

    const form = useForm<ContainerFormValues>({
        resolver: zodResolver(containerSchema),
        defaultValues: {
            statut: 'En préparation',
        }
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                numero: initialData.numero,
                transitaire_id: initialData.transitaire_id || undefined,
                statut: initialData.statut,
                date_depart: initialData.date_depart ? initialData.date_depart.split('T')[0] : '',
                date_arrivee_prevue: initialData.date_arrivee_prevue ? initialData.date_arrivee_prevue.split('T')[0] : '',
                date_arrivee_effective: initialData.date_arrivee_effective ? initialData.date_arrivee_effective.split('T')[0] : '',
                bateau: initialData.bateau || '',
                numero_voyage: initialData.numero_voyage || '',
                notes: initialData.notes || '',
            });
        } else {
            form.reset({
                statut: 'En préparation',
            });
        }
    }, [initialData, form, open]);

    const handleSubmit = async (values: ContainerFormValues) => {
        await onSubmit({
            ...values,
            transitaire_id: values.transitaire_id || null,
            date_depart: values.date_depart || null,
            date_arrivee_prevue: values.date_arrivee_prevue || null,
            date_arrivee_effective: values.date_arrivee_effective || null,
            bateau: values.bateau || null,
            numero_voyage: values.numero_voyage || null,
            notes: values.notes || null,
        });
        onOpenChange(false);
    };

    const isSubmitting = form.formState.isSubmitting;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Modifier le Container' : 'Nouveau Container'}</DialogTitle>
                    <DialogDescription>
                        Gérez les détails du container maritime.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Numéro */}
                        <div className="space-y-2">
                            <Label htmlFor="numero">Numéro du Container</Label>
                            <Input {...form.register('numero')} placeholder="Ex: CONT123456" />
                            {form.formState.errors.numero && <p className="text-sm text-red-500">{form.formState.errors.numero.message}</p>}
                        </div>

                        {/* Transitaire */}
                        <div className="space-y-2">
                            <Label htmlFor="transitaire_id">Transitaire</Label>
                            <Select
                                onValueChange={(val) => form.setValue('transitaire_id', val)}
                                value={form.watch('transitaire_id')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un transitaire" />
                                </SelectTrigger>
                                <SelectContent>
                                    {transitaires.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.nom}
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
                                    <SelectItem value="En préparation">En préparation</SelectItem>
                                    <SelectItem value="En transit">En transit</SelectItem>
                                    <SelectItem value="En Mer">En Mer</SelectItem>
                                    <SelectItem value="Arrivé">Arrivé</SelectItem>
                                    <SelectItem value="Dédouané">Dédouané</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dates */}
                        <div className="space-y-2">
                            <Label htmlFor="date_depart">Date Départ</Label>
                            <Input type="date" {...form.register('date_depart')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date_arrivee_prevue">Arrivée Prévue</Label>
                            <Input type="date" {...form.register('date_arrivee_prevue')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date_arrivee_effective">Arrivée Effective</Label>
                            <Input type="date" {...form.register('date_arrivee_effective')} />
                        </div>

                        {/* Bateau Info */}
                        <div className="space-y-2">
                            <Label htmlFor="bateau">Navire / Bateau</Label>
                            <Input {...form.register('bateau')} placeholder="Ex: MSC GINA" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="numero_voyage">Numéro Voyage</Label>
                            <Input {...form.register('numero_voyage')} placeholder="Ex: V123" />
                        </div>

                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea {...form.register('notes')} placeholder="Notes sur le container..." />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? 'Mettre à jour' : 'Enregistrer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
