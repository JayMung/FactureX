import { useEffect } from 'react';

export const REFRESH_EVENT = 'facturex-data-refresh';

/**
 * Déclenche un rafraîchissement global de l'application en dispatchant
 * un événement personnalisé. Utile pour synchroniser les vues après un CRUD.
 */
export const triggerAppRefresh = () => {
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
};

/**
 * Hook pour écouter les demandes de rafraîchissement global.
 * @param callback Fonction à exécuter lors du rafraîchissement
 */
export const useAppRefresh = (callback: () => void) => {
    useEffect(() => {
        window.addEventListener(REFRESH_EVENT, callback);
        return () => window.removeEventListener(REFRESH_EVENT, callback);
    }, [callback]);
};
