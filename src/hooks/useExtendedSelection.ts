import { useState, useEffect, useCallback } from 'react';

interface ExtendedSelectionOptions {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  allItems: any[];
  getItemId: (item: any) => string;
}

interface SelectionState {
  selectedItemIds: Set<string>;
  selectedPages: Set<number>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

export const useExtendedSelection = ({
  totalItems,
  pageSize,
  currentPage,
  allItems,
  getItemId
}: ExtendedSelectionOptions) => {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedItemIds: new Set(),
    selectedPages: new Set(),
    isAllSelected: false,
    isPartiallySelected: false
  });

  // Mettre à jour les IDs des éléments de la page actuelle
  const currentPageItemIds = new Set(
    allItems.map(item => getItemId(item))
  );

  // Vérifier si tous les éléments de la page actuelle sont sélectionnés
  const isCurrentPageFullySelected = Array.from(currentPageItemIds).every(
    id => selectionState.selectedItemIds.has(id)
  );

  // Vérifier si la page actuelle est partiellement sélectionnée
  const isCurrentPagePartiallySelected = Array.from(currentPageItemIds).some(
    id => selectionState.selectedItemIds.has(id)
  ) && !isCurrentPageFullySelected;

  // Calculer le nombre total de pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Sélectionner/désélectionner un élément individuel
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectionState(prev => {
      const newSelectedIds = new Set(prev.selectedItemIds);
      const newSelectedPages = new Set(prev.selectedPages);

      if (newSelectedIds.has(itemId)) {
        newSelectedIds.delete(itemId);
        
        // Vérifier si la page n'a plus aucun élément sélectionné
        const pageHasSelection = Array.from(currentPageItemIds).some(
          id => newSelectedIds.has(id)
        );
        
        if (!pageHasSelection) {
          newSelectedPages.delete(currentPage);
        }
      } else {
        newSelectedIds.add(itemId);
        newSelectedPages.add(currentPage);
      }

      // Vérifier si tout est sélectionné
      const isAllSelectedNow = newSelectedIds.size === totalItems;
      const isPartiallySelectedNow = newSelectedIds.size > 0 && !isAllSelectedNow;

      return {
        selectedItemIds: newSelectedIds,
        selectedPages: newSelectedPages,
        isAllSelected: isAllSelectedNow,
        isPartiallySelected: isPartiallySelectedNow
      };
    });
  }, [currentPage, currentPageItemIds, totalItems]);

  // Sélectionner/désélectionner tous les éléments de la page actuelle
  const toggleCurrentPageSelection = useCallback(() => {
    setSelectionState(prev => {
      const newSelectedIds = new Set(prev.selectedItemIds);
      const newSelectedPages = new Set(prev.selectedPages);

      if (isCurrentPageFullySelected) {
        // Désélectionner tous les éléments de la page actuelle
        currentPageItemIds.forEach(id => newSelectedIds.delete(id));
        newSelectedPages.delete(currentPage);
      } else {
        // Sélectionner tous les éléments de la page actuelle
        currentPageItemIds.forEach(id => newSelectedIds.add(id));
        newSelectedPages.add(currentPage);
      }

      const isAllSelectedNow = newSelectedIds.size === totalItems;
      const isPartiallySelectedNow = newSelectedIds.size > 0 && !isAllSelectedNow;

      return {
        selectedItemIds: newSelectedIds,
        selectedPages: newSelectedPages,
        isAllSelected: isAllSelectedNow,
        isPartiallySelected: isPartiallySelectedNow
      };
    });
  }, [currentPage, currentPageItemIds, isCurrentPageFullySelected, totalItems]);

  // Sélectionner tous les éléments (toutes les pages)
  const selectAllPages = useCallback(async () => {
    // Cette fonction nécessitera un appel API pour obtenir tous les IDs
    // Pour l'instant, nous allons simuler avec les données disponibles
    const allIds = new Set<string>();
    
    // TODO: Remplacer par un appel API réel
    // const response = await api.getAllItemIds();
    // response.ids.forEach(id => allIds.add(id));
    
    // Simulation : ajouter tous les IDs connus
    for (let page = 1; page <= totalPages; page++) {
      // Simuler l'obtention des IDs pour chaque page
      // En pratique, cela viendrait d'une API
    }

    setSelectionState({
      selectedItemIds: allIds,
      selectedPages: new Set(Array.from({ length: totalPages }, (_, i) => i + 1)),
      isAllSelected: true,
      isPartiallySelected: false
    });
  }, [totalPages]);

  // Désélectionner tous les éléments
  const clearAllSelections = useCallback(() => {
    setSelectionState({
      selectedItemIds: new Set(),
      selectedPages: new Set(),
      isAllSelected: false,
      isPartiallySelected: false
    });
  }, []);

  // Sélectionner les éléments de pages spécifiques
  const selectPages = useCallback((pages: number[]) => {
    setSelectionState(prev => {
      const newSelectedPages = new Set(prev.selectedPages);
      pages.forEach(page => newSelectedPages.add(page));
      
      return {
        ...prev,
        selectedPages: newSelectedPages,
        isPartiallySelected: true
      };
    });
  }, []);

  // Obtenir les statistiques de sélection
  const getSelectionStats = useCallback(() => {
    const selectedCount = selectionState.selectedItemIds.size;
    const selectedPageCount = selectionState.selectedPages.size;
    const hasCurrentPageSelection = isCurrentPageFullySelected || isCurrentPagePartiallySelected;
    
    return {
      selectedCount,
      selectedPageCount,
      totalPages,
      currentPageSelected: hasCurrentPageSelection,
      currentPageFullySelected: isCurrentPageFullySelected,
      currentPagePartiallySelected: isCurrentPagePartiallySelected
    };
  }, [
    selectionState.selectedItemIds.size,
    selectionState.selectedPages.size,
    totalPages,
    isCurrentPageFullySelected,
    isCurrentPagePartiallySelected
  ]);

  // Effet pour synchroniser avec les changements de page
  useEffect(() => {
    // Réinitialiser l'état de la page actuelle lors du changement de page
    // mais conserver les sélections existantes
    setSelectionState(prev => ({
      ...prev,
      // L'état reste le même, juste les calculs de page actuelle changent
    }));
  }, [currentPage]);

  return {
    // État
    selectedItemIds: selectionState.selectedItemIds,
    selectedPages: selectionState.selectedPages,
    isAllSelected: selectionState.isAllSelected,
    isPartiallySelected: selectionState.isPartiallySelected,
    
    // État de la page actuelle
    isCurrentPageFullySelected,
    isCurrentPagePartiallySelected,
    
    // Actions
    toggleItemSelection,
    toggleCurrentPageSelection,
    selectAllPages,
    clearAllSelections,
    selectPages,
    
    // Utilitaires
    getSelectionStats,
    isItemSelected: (itemId: string) => selectionState.selectedItemIds.has(itemId)
  };
};