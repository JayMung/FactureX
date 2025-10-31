import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { adminService } from '@/services/adminService';

/**
 * SECURE ADMIN SETUP
 * 
 * This page has been secured to prevent unauthorized admin account creation.
 * Admin accounts can only be created through:
 * 1. Existing admin invitation system
 * 2. Direct database functions by super admin
 * 3. Manual database operations
 * 
 * The previous vulnerable implementation has been removed.
 */
const AdminSetup = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Check if user is already authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check if user is already admin
          const isAdmin = await adminService.isCurrentUserAdmin();
          
          if (isAdmin) {
            // User is admin, redirect to dashboard
            navigate('/dashboard');
            return;
          }
          
          // User is logged in but not admin, redirect to dashboard
          navigate('/dashboard');
          return;
        }
        
        // User not logged in, redirect to login
        navigate('/login');
        
      } catch (error) {
        console.error('Error in admin setup:', error);
        // On any error, redirect to login for safety
        navigate('/login');
      }
    };

    checkAndRedirect();
  }, [navigate]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirection...</p>
      </div>
    </div>
  );
};

export default AdminSetup;