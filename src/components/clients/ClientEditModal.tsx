"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, User } from 'lucide-react';
import type { Client } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabaseService } from '@/services/supabase';

interface ClientEditModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ClientEditModal: React.FC<ClientEditModalProps> = ({
  client,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    nom: '',
    telephone: '',
    ville: '',
    total_paye: 0
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Initialiser le formulaire avec les données du client
  useEffect(() => {
    if (client) {
      setFormData({
        nom: client.nom,
        telephone: client.telephone,
        ville: client.ville,
        total_paye: client.total_paye || 0
      });
      setErrors({});
    }
  }, [client]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis';
    } else if (!/^[+]?[\d\s-()]{10,}$/.test(formData.telephone)) {
      newErrors.telephone = 'Format de téléphone invalide';
    }

    if (!formData.ville.trim()) {
      newErrors.ville = 'La ville est requise';
    }

    if (formData.total_paye < 0) {
      newErrors.total_paye = 'Le montant payé ne peut pas être négatif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !client) return;

    setIsLoading(true);
    try {
      const updateData = {
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim(),
        ville: formData.ville.trim(),
        total_paye: formData.total_paye
      };

      await supabaseService.updateClient(client.id, updateData);
      showSuccess('Client mis à jour avec succès');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      showError(error.message || 'Erreur lors de la mise à jour du client');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_paye' ? parseFloat(value) || 0 : value
    }));
    
    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Modifier le Client</span>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {errors.general}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="nom">Nom complet *</Label>
            <Input
              id="nom"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Jean Mukendi"
              className={errors.nom ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.nom && (
              <p className="text-sm text-red-600">{errors.nom}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone *</Label>
            <Input
              id="telephone"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              placeholder="+243 123 456 789"
              className={errors.telephone ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.telephone && (
              <p className="text-sm text-red-600">{errors.telephone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ville">Ville *</Label>
            <Input
              id="ville"
              name="ville"
              value={formData.ville}
              onChange={handleChange}
              placeholder="Kinshasa"
              className={errors.ville ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.ville && (
              <p className="text-sm text-red-600">{errors.ville}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_paye">Total payé</Label>
            <Input
              id="total_paye"
              name="total_paye"
              type="number"
              step="0.01"
              value={formData.total_paye}
              onChange={handleChange}
              placeholder="0.00"
              className={errors.total_paye ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.total_paye && (
              <p className="text-sm text-red-600">{errors.total_paye}</p>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientEditModal;