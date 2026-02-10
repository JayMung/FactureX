import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Composant pour gérer l'état hors-ligne et les prompts de mise à jour PWA
 */
export const OfflinePrompt = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            // Optionnel: On pourrait montrer un message "Retour en ligne" pendant quelques secondes
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:max-w-md">
            <AnimatePresence>
                {isOffline && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="mb-4"
                    >
                        <Alert variant="destructive" className="border-red-500 bg-red-50 shadow-lg">
                            <WifiOff className="h-4 w-4" />
                            <AlertTitle className="font-bold">Mode Hors Ligne</AlertTitle>
                            <AlertDescription className="text-sm">
                                Vous n'êtes plus connecté à internet. Certaines fonctionnalités peuvent être limitées.
                            </AlertDescription>
                        </Alert>
                    </motion.div>
                )}

                {!isOffline && showPrompt && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    >
                        <Alert className="border-emerald-500 bg-emerald-50 shadow-lg">
                            <RefreshCw className="h-4 w-4 text-emerald-600" />
                            <div className="flex flex-col gap-3">
                                <div>
                                    <AlertTitle className="font-bold text-emerald-900">Mise à jour disponible</AlertTitle>
                                    <AlertDescription className="text-emerald-800 text-sm">
                                        Une nouvelle version de l'application est prête.
                                    </AlertDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => window.location.reload()}
                                    >
                                        Mettre à jour
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-emerald-700"
                                        onClick={() => setShowPrompt(false)}
                                    >
                                        Plus tard
                                    </Button>
                                </div>
                            </div>
                        </Alert>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OfflinePrompt;
