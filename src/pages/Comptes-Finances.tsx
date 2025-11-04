import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Comptes from './Comptes';
import MouvementsComptes from './Mouvements-Comptes';

export default function ComptesFinances() {
  const [activeTab, setActiveTab] = useState('comptes');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="comptes">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
        </TabsList>

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
