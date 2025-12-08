import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  UserPlus, 
  UserX, 
  Mail, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  Crown,
  Users
} from 'lucide-react';
import { adminService, type AdminRole } from '@/services/adminService';
import { showSuccess, showError } from '@/utils/toast';

export const AdminManager = () => {
  const [admins, setAdmins] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const adminList = await adminService.getAllAdmins();
      setAdmins(adminList);
      setError('');
    } catch (err: any) {
      console.error('Error loading admins:', err);
      setError(err.message || 'Erreur lors du chargement des administrateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviteLoading(true);
      setError('');

      // First create invitation
      const token = await adminService.createAdminInvitation(inviteEmail);
      
      showSuccess(`Invitation administrateur envoyée à ${inviteEmail}`);
      setInviteEmail('');
      
      // In a real implementation, you would send this token via email
      console.log('Admin invitation token:', token);
      
    } catch (err: any) {
      console.error('Error granting admin:', err);
      setError(err.message || 'Erreur lors de la création de l\'invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeAdmin = async (userId: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir révoquer les droits d'administrateur de ${email} ?`)) {
      return;
    }

    try {
      await adminService.revokeAdminRole(userId);
      showSuccess('Droits d\'administrateur révoqués avec succès');
      await loadAdmins(); // Refresh the list
    } catch (err: any) {
      console.error('Error revoking admin:', err);
      showError(err.message || 'Erreur lors de la révocation des droits d\'administrateur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="h-6 w-6 text-green-600" />
        <h2 className="text-2xl font-bold">Gestion des Administrateurs</h2>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Invite Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Inviter un Administrateur</span>
          </CardTitle>
          <CardDescription>
            Envoyez une invitation par email pour créer un nouveau compte administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGrantAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email de l'administrateur</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@exemple.com"
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={inviteLoading}
              className="bg-green-500 hover:bg-green-600"
            >
              {inviteLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Envoi en cours...
                </div>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer l'invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Administrateurs Actuels ({admins.length})</span>
          </CardTitle>
          <CardDescription>
            Liste des utilisateurs ayant des droits d'administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun administrateur trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      {admin.role === 'super_admin' ? (
                        <Crown className="h-5 w-5 text-green-600" />
                      ) : (
                        <Shield className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{admin.email}</p>
                        <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Ajouté le {new Date(admin.granted_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Actif</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRevokeAdmin(admin.user_id, admin.email)}
                    className="opacity-75 hover:opacity-100"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Révoquer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">🔒 Sécurité des Administrateurs</p>
              <ul className="space-y-1 text-xs">
                <li>• Seuls les administrateurs existants peuvent inviter de nouveaux administrateurs</li>
                <li>• Les invitations expirent après 7 jours pour des raisons de sécurité</li>
                <li>• Les administrateurs ne peuvent pas révoquer leurs propres droits</li>
                <li>• Toutes les actions sont journalisées pour des raisons d'audit</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
