/**
 * Utilitaire pour gérer les erreurs et afficher des messages conviviaux
 */

export const getErrorMessage = (error: any): string => {
  // Erreur de connexion réseau
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return '❌ Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
  }

  // Erreur réseau générique
  if (error.message?.includes('NetworkError') || error.message?.includes('Network request failed')) {
    return '❌ Problème de réseau. Vérifiez votre connexion internet.';
  }

  // Timeout
  if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
    return '⏱️ La requête a pris trop de temps. Le serveur ne répond pas.';
  }

  // Erreur Supabase spécifique
  if (error.code === 'PGRST301') {
    return '🔒 Accès refusé. Vous n\'avez pas les permissions nécessaires.';
  }

  // Erreur d'authentification
  if (error.status === 401 || error.message?.includes('JWT') || error.message?.includes('auth')) {
    return '🔐 Session expirée. Veuillez vous reconnecter.';
  }

  // Erreur serveur
  if (error.status >= 500) {
    return '🔧 Erreur serveur. Nos serveurs rencontrent un problème temporaire.';
  }

  // Erreur 404
  if (error.status === 404) {
    return '🔍 Ressource introuvable.';
  }

  // Message d'erreur par défaut
  return error.message || '❌ Une erreur inattendue s\'est produite.';
};

/**
 * Vérifie si l'utilisateur est en ligne
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Affiche un message d'erreur convivial avec des suggestions
 */
export const getFriendlyErrorMessage = (error: any, context?: string): string => {
  const baseMessage = getErrorMessage(error);
  
  if (!isOnline()) {
    return '📡 Vous êtes hors ligne. Vérifiez votre connexion internet.';
  }

  // Ajouter le contexte si fourni
  if (context) {
    return `${context}: ${baseMessage}`;
  }

  return baseMessage;
};

/**
 * Retry une fonction avec backoff exponentiel
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Ne pas retry si c'est une erreur d'authentification ou de permission
      if (error.status === 401 || error.status === 403 || error.code === 'PGRST301') {
        throw error;
      }

      // Attendre avant de réessayer (backoff exponentiel)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
};
