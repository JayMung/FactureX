import { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabase';
import type { UserProfile } from '@/types';

export const useUserProfiles = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // S'assurer que le profil de l'utilisateur actuel existe
      const ensureProfileResponse = await supabaseService.ensureCurrentUserProfile();
      if (ensureProfileResponse.error) {
        console.warn('Erreur lors de la création du profil:', ensureProfileResponse.error);
      }
      
      const response = await supabaseService.getUserProfiles();
      
      console.log('UserProfiles response:', response);
      
      if (response.error) {
        setError(response.error);
        console.error('Error fetching user profiles:', response.error);
      } else {
        console.log('User profiles data:', response.data);
        setUserProfiles(response.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserProfile = async (id: string, isActive: boolean) => {
    try {
      const response = await supabaseService.toggleUserProfile(id, isActive);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Mettre à jour l'état local
      setUserProfiles(prev => 
        prev.map(profile => 
          profile.id === id ? { ...profile, is_active: isActive } : profile
        )
      );
      
      // Auto-refresh pour synchroniser les données
      await fetchUserProfiles();
      
      return response;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const createUserProfile = async (profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await supabaseService.createUserProfile(profileData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Mettre à jour l'état local
      if (response.data) {
        setUserProfiles(prev => [...prev, response.data!]);
      }
      
      // Auto-refresh pour synchroniser les données
      await fetchUserProfiles();
      
      return response;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const updateUserProfile = async (id: string, profileData: Partial<UserProfile>) => {
    try {
      const response = await supabaseService.updateUserProfile(id, profileData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Mettre à jour l'état local
      if (response.data) {
        setUserProfiles(prev => 
          prev.map(profile => 
            profile.id === id ? response.data! : profile
          )
        );
      }
      
      // Auto-refresh pour synchroniser les données
      await fetchUserProfiles();
      
      return response;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  useEffect(() => {
    fetchUserProfiles();
  }, []);

  return {
    userProfiles,
    isLoading,
    error,
    refetch: fetchUserProfiles,
    toggleUserProfile,
    createUserProfile,
    updateUserProfile
  };
};