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
      const response = await supabaseService.getUserProfiles();
      
      if (response.error) {
        setError(response.error);
      } else {
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