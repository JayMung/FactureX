import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowLeftRight } from 'lucide-react';
import Comptes from './Comptes';
import MouvementsComptes from './Mouvements-Comptes';

export default function ComptesFinances() {
  const [activeTab, setActiveTab] = useState('comptes');

  return (
    <div className="space-y-4 md:space-y-6 p-2 sm:p-4 md:p-0 animate-in fade-in duration-300">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-14 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <TabsTrigger 
              value="comptes"
              className="flex items-center justify-center gap-2 h-full text-base font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all border-r border-gray-200 dark:border-gray-700 last:border-r-0 data-[state=active]:border-transparent"
            >
              <Wallet className="h-5 w-5" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger 
              value="mouvements"
              className="flex items-center justify-center gap-2 h-full text-base font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-purple-600 transition-all border-r border-gray-200 dark:border-gray-700 last:border-r-0 data-[state=active]:border-transparent"
            >
              <ArrowLeftRight className="h-5 w-5" />
              Mouvements
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="comptes" className="mt-6">
          <Comptes />
        </TabsContent>

        <TabsContent value="mouvements" className="mt-6">
          <MouvementsComptes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
