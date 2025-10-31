import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertCircle, Loader2, Crown } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { supabase } from '@/integrations/supabase/client';

const AdminInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token d\'invitation manquant');
      setLoading(false);
      return;
    }

    checkInvitation();
  }, [token]);

  const checkInvitation = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Vous devez être connecté pour accepter une invitation administrateur');
        setLoading(false);
        return;
      }

      // Get user invitations
      const invitations = await adminService.getUserInvitations();
      const matchingInvitation = invitations.find(inv => inv.invitation_token === token);

      if (!matchingInvitation) {
        setError('Invitation invalide ou expirée');
        setLoading(false);
        return;
      }

      // Check if email matches
      if (matchingInvitation.email !== user.email) {
        setError('Cette invitation n\'est pas destinée à votre adresse email');
        setLoading(false);
        return;
      }

      setInvitation(matchingInvitation);
      setLoading(false);
      
    } catch (err: any) {
      console.error('Error checking invitation:', err);
      setError(err.message || 'Erreur lors de la vérification de l\'invitation');
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      setError('');

      await adminService.acceptAdminInvitation(token);
      
      setSuccess(true);
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'Erreur lors de l\'acceptation de l\'invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-6 w-6 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bienvenue Administrateur !
              </h2>
              <p className="text-gray-600 mb-4">
                Vous avez accepté l'invitation et êtes maintenant administrateur de FactureX.
              </p>
              <p className="text-sm text-gray-500">
                Vous allez être redirigé vers votre tableau de bord...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Invitation Administrateur</h2>
          <p className="mt-2 text-sm text-gray-600">
            Vous avez été invité à devenir administrateur de FactureX
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              <span>Invitation Spéciale</span>
            </CardTitle>
            <CardDescription>
              Acceptez cette invitation pour obtenir des droits d'administrateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {invitation && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Détails de l'invitation:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Email: {invitation.email}</li>
                      <li>• Expire le: {new Date(invitation.expires_at).toLocaleDateString()}</li>
                      <li>• Invité par: Un administrateur existant</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Button 
                onClick={handleAcceptInvitation}
                className="w-full bg-green-500 hover:bg-green-600"
                disabled={accepting || !!error}
              >
                {accepting ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Acceptation en cours...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accepter l'invitation
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Plus tard
              </Button>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Crown className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">🔐 Responsabilités d'Administrateur:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Gestion complète des utilisateurs</li>
                    <li>• Configuration des permissions</li>
                    <li>• Accès aux logs d'audit</li>
                    <li>• Gestion des paramètres système</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminInvitation;
