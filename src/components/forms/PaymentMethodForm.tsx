"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, CreditCard } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { supabaseService } from '@/services/supabase';

interface PaymentMethodFormProps {
  paymentMethod?: PaymentMethod | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({ 
  paymentMethod, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    icon: '',
    description: '',
    is_active: true
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const icons = [
    { value: 'smartphone', label: 'Téléphone' },
    { value: 'credit-card', label: 'Carte bancaire' },
    { value: 'bank', label: 'Banque' },
    { value: 'money', label: 'Espèces' },
    { value: 'globe', label: 'International' },
    { value: 'shield', label: 'Sécurisé' },
    { value: 'zap', label: 'Rapide' },
    { value: 'star', label: 'Premium' }
  ];

  // Initialiser le formulaire avec les données du moyen de paiement
  useEffect(() => {
    if (paymentMethod) {
      setFormData({
        name: paymentMethod.name,
        code: paymentMethod.code,
        icon: paymentMethod.icon || '',
        description: paymentMethod.description || '',
        is_active: paymentMethod.is_active
      });
      setErrors({});
    }
  }, [paymentMethod]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Le code est requis';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Le code doit contenir uniquement des majuscules, chiffres et underscores';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateCode = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (paymentMethod) {
        await supabaseService.updatePaymentMethod(paymentMethod.id, formData);
        showSuccess('Moyen de paiement mis à jour avec succès');
      } else {
        await supabaseService.createPaymentMethod(formData);
        showSuccess('Moyen de paiement créé avec succès');
      }
      
      onSuccess?.();
      onClose();
      // Reset form
      setFormData({
        name: '',
        code: '',
        icon: '',
        description: '',
        is_active: true
      });
      setErrors({});
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      showError(error.message || 'Erreur lors de la sauvegarde du moyen de paiement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Générer automatiquement le code à partir du nom
    if (name === 'name' && !paymentMethod) {
      const generatedCode = generateCode(value);
      setFormData(prev => ({
        ...prev,
        code: generatedCode
      }));
    }
    
    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleIconChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      icon: value
    }));
  };

  if (!isOpen) return null;

  const isEditing = !!paymentMethod;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              {isEditing ? 'Modifier le moyen de paiement' : 'Nouveau moyen de paiement'}
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
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Airtel Money"
                className={errors.name ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Ex: AIRTEL_MONEY"
                className={errors.code ? 'border-red-500' : ''}
                disabled={isLoading || isEditing}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code}</p>
              )}
              {!isEditing && (
                <p className="text-xs text-gray-500">
                  Généré automatiquement à partir du nom
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icône</Label>
              <Select
                value={formData.icon}
                onValueChange={handleIconChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une icône" />
                </SelectTrigger>
                <SelectContent>
                  {icons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description optionnelle"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                disabled={isLoading}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active">Actif</Label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
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
                    {isEditing ? 'Mettre à jour' : 'Créer'}
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

export default PaymentMethodForm;