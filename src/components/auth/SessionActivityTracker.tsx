"use client";

import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface SessionActivityTrackerProps {
  children: React.ReactNode;
  trackActivity?: boolean; // Enable/disable activity tracking
}

export const SessionActivityTracker: React.FC<SessionActivityTrackerProps> = ({ 
  children,
  trackActivity = true 
}) => {
  const { updateActivity, sessionValid } = useAuth();

  // Update session activity
  const updateSessionActivity = useCallback(() => {
    if (trackActivity && sessionValid) {
      updateActivity();
    }
  }, [trackActivity, sessionValid, updateActivity]);

  useEffect(() => {
    if (!trackActivity || !sessionValid) return;

    // Track user activity events
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
      'focus'
    ];

    // Throttle activity updates to avoid excessive calls
    let lastUpdate = 0;
    const THROTTLE_TIME = 5000; // 5 seconds

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > THROTTLE_TIME) {
        updateSessionActivity();
        lastUpdate = now;
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Also track visibility changes (user switching tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateSessionActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track page focus/blur
    const handleFocus = () => updateSessionActivity();
    const handleBlur = () => updateSessionActivity();
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Periodic activity check (every 2 minutes)
    const periodicCheck = setInterval(() => {
      updateSessionActivity();
    }, 2 * 60 * 1000);

    return () => {
      // Clean up event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      clearInterval(periodicCheck);
    };
  }, [trackActivity, sessionValid, updateSessionActivity]);

  return <>{children}</>;
};

export default SessionActivityTracker;
