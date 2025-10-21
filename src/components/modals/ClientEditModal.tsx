import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  User, 
  Phone, 
  MapPin, 
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import type { Client } from '@/types';

interface ClientEditModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedClient: Client) => Promise<void>;
}

const ClientEditModal: React.FC<ClientEditModalProps> = ({
  client,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    nom: '',
    telephone: '',
    ville: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialiser le formulaire quand le client change
  useEffect(() => {
    if (client) {
      setFormData({
        nom: client.nom,
        telephone: client.telephone,
        ville: client.ville,
      });
      setErrors({});
    }
  }, [client]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    } else if (formData.nom.trim().length < 2) {
      newErrors.nom = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis';
    } else if (!/^[\d\+\-\s\(\)]{8,}$/.test(formData.telephone.trim())) {
      newErrors.telephone = 'Format de téléphone invalide';
    }

    if (!formData.ville.trim()) {
      newErrors.ville = 'La ville est requise';
    } else if (formData.ville.trim().length < 2) {
      newErrors.ville = 'La ville doit contenir au moins 2 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!client || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const updatedClient: Client = {
        ...client,
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim(),
        ville: formData.ville.trim(),
        updated_at: new Date().toISOString()
      };

      await onSave(updatedClient);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Modifier le Client
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span>Informations du Client</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Erreur générale */}
              {errors.submit && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}

              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-sm font-medium">
                  Nom complet *
                </Label>
                <Input
                  id="nom"
                  type="text"
                  value={formData.nom}
                  onChange={(e) => handleInputChange('nom', e.target.value)}
                  placeholder="Nom complet du client"
                  className={errors.nom ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.nom && (
                  <p className="text-sm text-red-600">{errors.nom}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="telephone" className="text-sm font-medium flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>Téléphone *</span>
                </Label>
                <Input
                  id="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  placeholder="+243 123 456 789"
                  className={errors.telephone ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.telephone && (
                  <p className="text-sm text-red-600">{errors.telephone}</p>
                )}
              </div>

              {/* Ville */}
              <div className="space-y-2">
                <Label htmlFor="ville" className="text-sm font-medium flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>Ville *</span>
                </Label>
                <Input
                  id="ville"
                  type="text"
                  value={formData.ville}
                  onChange={(e) => handleInputChange('ville', e.target.value)}
                  placeholder="Ville de résidence"
                  className={errors.ville ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {errors.ville && (
                  <p className="text-sm text-red-600">{errors.ville}</p>
                )}
              </div>

              {/* Note */}
              <div className="text-xs text-gray-500 italic">
                * Champs obligatoires
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
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