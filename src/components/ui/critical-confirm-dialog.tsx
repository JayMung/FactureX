"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertOctagon, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../auth/AuthProvider';

interface CriticalConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  expectedName: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void>;
  isConfirming?: boolean;
}

const CriticalConfirmDialog: React.FC<CriticalConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  expectedName,
  confirmText = 'Supprimer définitivement',
  cancelText = 'Annuler',
  onConfirm,
  isConfirming = false,
}) => {
  const { user } = useAuth();
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setNameInput('');
      setPasswordInput('');
      setError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    setError(null);

    // 1. Verify name matches exactly
    if (nameInput !== expectedName) {
      setError(`Le nom saisi ne correspond pas à "${expectedName}".`);
      return;
    }

    if (!passwordInput) {
      setError("Veuillez saisir votre mot de passe administrateur.");
      return;
    }

    if (!user?.email) {
      setError("Utilisateur non connecté.");
      return;
    }

    setIsVerifying(true);
    try {
      // 2. Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordInput,
      });

      if (signInError) {
        throw new Error("Mot de passe incorrect.");
      }

      // Password verified, proceed with confirmation
      await onConfirm();
      
      // We don't automatically close the modal here because onConfirm might handle its own state
      // or we might want to wait for the parent to set open=false
    } catch (err: any) {
      setError(err.message || "Erreur de vérification du mot de passe.");
    } finally {
      setIsVerifying(false);
    }
  };

  const isLoading = isConfirming || isVerifying;
  const isFormComplete = nameInput === expectedName && passwordInput.length > 0;

  return (
    <Dialog open={open} onOpenChange={!isLoading ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-[425px] border-red-200 shadow-lg">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-red-600 mb-2">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-gray-700 py-2 border-l-4 border-red-500 pl-3 bg-red-50/50 rounded-r">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="space-y-2">
            <Label htmlFor="confirm_name" className="text-sm font-medium">
              Tapez <span className="font-bold text-red-600 select-all">{expectedName}</span> pour confirmer :
            </Label>
            <Input
              id="confirm_name"
              type="text"
              placeholder={expectedName}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={isLoading}
              className="border-gray-300 focus-visible:ring-red-500"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-sm font-medium">
              Mot de passe administrateur :
            </Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Votre mot de passe"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              disabled={isLoading}
              className="border-gray-300 focus-visible:ring-red-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-gray-300"
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !isFormComplete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {confirmText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CriticalConfirmDialog;
