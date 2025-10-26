"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X } from 'lucide-react';
import type { Client, CreateClientData } from '@/types';
import { useClients } from '@/hooks/useClients';
import { showSuccess, showError } from '@/utils/toast';
import { capitalizeWords } from '@/utils/textFormat';

interface ClientFormProps {
  client?: Client;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ 
  client, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState<CreateClientData>({
    nom: client?.nom || '',
    telephone: client?.telephone || '',
    ville: client?.ville || ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { createClient, updateClient, isCreating, isUpdating } = useClients();
  const isEditing = !!client;
  const isLoading = isCreating || isUpdating;

  // Mettre à jour le formulaire quand le client change
  useEffect(() => {
    if (client) {
      setFormData({
        nom: client.nom || '',
        telephone: client.telephone || '',
        ville: client.ville || ''
      });
    } else {
      setFormData({
        nom: '',
        telephone: '',
        ville: ''
      });
    }
    setErrors({});
  }, [client, isOpen]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      // Capitaliser chaque mot du nom (Jean Mukendi)
      const dataToSave = {
        ...formData,
        nom: capitalizeWords(formData.nom.trim())
      };

      if (isEditing && client) {
        await updateClient({ id: client.id, data: dataToSave });
      } else {
        await createClient(dataToSave);
      }
      
      onSuccess?.();
      onClose();
      // Reset form
      setFormData({ nom: '', telephone: '', ville: '' });
      setErrors({});
    } catch (error: any) {
      // Gestion spécifique pour les doublons
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        setErrors({ telephone: 'Ce numéro existe déjà' });
        // Le toast est déjà affiché par le hook useClients
      } else {
        setErrors({ general: error.message || 'Une erreur est survenue' });
        // Le toast est déjà affiché par le hook useClients
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {isEditing ? 'Modifier le client' : 'Nouveau client'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
              />
              {errors.ville && (
                <p className="text-sm text-red-600">{errors.ville}</p>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Mettre à jour' : 'Créer le client'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientForm;