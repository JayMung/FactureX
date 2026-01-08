import React from 'react';
import { Calculator, Loader2 } from 'lucide-react';

interface TransactionCalculationsProps {
    formData: {
        montant: string;
        motif: string;
    };
    isCalculating: boolean;
    calculations: {
        frais: number;
        benefice: number;
        montant_cny: number;
        taux_usd_cny: number;
        taux_usd_cdf: number;
    };
    formatCurrency: (amount: number, currency?: string) => string;
}

export const TransactionCalculations: React.FC<TransactionCalculationsProps> = ({
    formData,
    isCalculating,
    calculations,
    formatCurrency
}) => {
    if (!formData.montant || parseFloat(formData.montant) <= 0) return null;

    if (isCalculating) {
        return (
            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Calcul en cours...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-medium flex items-center">
                <Calculator className="mr-2 h-4 w-4" />
                Prévisualisation des calculs
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-gray-600">Frais ({formData.motif}):</span>
                    <span className="ml-2 font-medium">
                        {formatCurrency(calculations.frais, 'USD')}
                    </span>
                </div>
                <div>
                    <span className="text-gray-600">Bénéfice:</span>
                    <span className="ml-2 font-medium text-green-600">
                        {formatCurrency(calculations.benefice, 'USD')}
                    </span>
                </div>
                <div>
                    <span className="text-gray-600">Montant CNY:</span>
                    <span className="ml-2 font-medium text-blue-600">
                        {formatCurrency(calculations.montant_cny, 'CNY')}
                    </span>
                </div>
                <div>
                    <span className="text-gray-600">Taux USD/CDF:</span>
                    <span className="ml-2 font-medium">
                        {calculations.taux_usd_cdf.toLocaleString('fr-FR')}
                    </span>
                </div>
            </div>
        </div>
    );
};
