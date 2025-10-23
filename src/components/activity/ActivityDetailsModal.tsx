import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Calendar,
  Globe,
  FileText,
  ArrowRight,
  Tag
} from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  cible?: string;
  cible_id?: string;
  details?: any;
  date: string;
  created_at?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role?: string;
  };
}

interface ActivityDetailsModalProps {
  activity: ActivityLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  activity,
  open,
  onOpenChange,
}) => {
  if (!activity) return null;

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderChangeValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400">Non défini</span>;
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderChanges = () => {
    if (!activity.details?.changes) return null;

    const { before, after } = activity.details.changes;

    if (!before && !after) return null;

    // Comparer les valeurs avant/après
    const beforeObj = before || {};
    const afterObj = after || {};
    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Modifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from(allKeys).map((key) => {
            const beforeValue = beforeObj[key];
            const afterValue = afterObj[key];
            const hasChanged = JSON.stringify(beforeValue) !== JSON.stringify(afterValue);

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Tag className="h-3 w-3 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{key}</span>
                  {hasChanged && (
                    <Badge variant="outline" className="text-xs">Modifié</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-5">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Avant</p>
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-sm break-words">
                      {renderChangeValue(beforeValue)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Après</p>
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-sm break-words">
                      {renderChangeValue(afterValue)}
                    </div>
                  </div>
                </div>
                <Separator />
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{activity.action}</DialogTitle>
          <DialogDescription>
            Détails complets de l'activité
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Date & Heure</span>
                  </div>
                  <p className="text-sm font-medium pl-6">
                    {formatDateTime(activity.created_at || activity.date)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Utilisateur</span>
                  </div>
                  <div className="pl-6">
                    <p className="text-sm font-medium">
                      {activity.user?.first_name} {activity.user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{activity.user?.email}</p>
                    {activity.user?.role && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {activity.user.role}
                      </Badge>
                    )}
                  </div>
                </div>

                {activity.cible && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Type d'entité</span>
                    </div>
                    <p className="text-sm font-medium pl-6">
                      <Badge variant="secondary">{activity.cible}</Badge>
                    </p>
                  </div>
                )}

                {activity.cible_id && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Tag className="h-4 w-4" />
                      <span className="text-sm">ID de l'entité</span>
                    </div>
                    <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded ml-6 inline-block">
                      {activity.cible_id}
                    </p>
                  </div>
                )}

                {activity.details?.page && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">Page</span>
                    </div>
                    <p className="text-sm font-medium pl-6">{activity.details.page}</p>
                  </div>
                )}

                {activity.details?.entityName && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Nom de l'entité</span>
                    </div>
                    <p className="text-sm font-medium pl-6">{activity.details.entityName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Changements */}
          {renderChanges()}

          {/* Métadonnées du navigateur */}
          {activity.details?.userAgent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Informations techniques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Navigateur</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {activity.details.userAgent}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Détails additionnels */}
          {activity.details && Object.keys(activity.details).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Détails complets (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                  {JSON.stringify(activity.details, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDetailsModal;
