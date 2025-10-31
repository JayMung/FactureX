"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

interface SessionTimeoutWarningProps {
  warningTime?: number; // Time in milliseconds before showing warning (default: 5 minutes)
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({ 
  warningTime = 5 * 60 * 1000 // 5 minutes
}) => {
  const { sessionValid, remainingTime, updateActivity } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!sessionValid) {
      setShowWarning(false);
      return;
    }

    // Show warning when remaining time is less than warning time
    if (remainingTime > 0 && remainingTime <= warningTime) {
      setShowWarning(true);
      setTimeRemaining(remainingTime);
    } else {
      setShowWarning(false);
    }
  }, [remainingTime, sessionValid, warningTime]);

  // Update timer every second when warning is shown
  useEffect(() => {
    if (!showWarning) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning]);

  const handleExtendSession = () => {
    updateActivity();
    setShowWarning(false);
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} seconde${seconds > 1 ? 's' : ''}`;
    }
    return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
  };

  if (!showWarning || timeRemaining <= 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-right duration-300">
      <Card className="border-orange-200 bg-orange-50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Clock className="h-5 w-5" />
            Session Expirée Bientôt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-100">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Votre session expirera dans <strong>{formatTime(timeRemaining)}</strong>. 
              Veuillez étendre votre session pour éviter d'être déconnecté.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleExtendSession}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Étendre la Session
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowWarning(false)}
              className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Ignorer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionTimeoutWarning;
