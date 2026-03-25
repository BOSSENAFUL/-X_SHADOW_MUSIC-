// Updated UserActivityTracker.jsx
"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function UserActivityTracker({ 
  enabled = true,
  recordOnMount = true,
  recordOnFocus = true,
  recordOnVisibilityChange = true 
}) {
  const { data: session, status } = useSession();
  const hasRecordedToday = useRef(false);
  const isRecording = useRef(false);
  const lastRecordedDate = useRef(null);

  const recordActivity = async (source = 'manual') => {
    // Check if we should record
    if (!enabled || status !== 'authenticated' || !session?.user?.email) {
      return;
    }

    // Always use IST (Asia/Kolkata) to match the server-side date computation.
    // Using the browser's local timezone here would cause the dedup guard to
    // diverge from the server's "today", potentially firing duplicate requests.
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    // Check if already recorded today
    if (hasRecordedToday.current && lastRecordedDate.current === today) {
      return;
    }

    // Prevent concurrent requests
    if (isRecording.current) {
      return;
    }

    try {
      isRecording.current = true;

      // Detect if the user is running the app as an installed PWA
      // - matchMedia standalone: Chrome/Edge/Samsung Browser on Android & desktop
      // - navigator.standalone: Safari on iOS when added to Home Screen
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = window.navigator.standalone === true;
      const isPWA = isStandalone || isIOSPWA;

      const response = await fetch('/api/analytics/record-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          isPWA,                           // tells server: Browser vs PWA
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        hasRecordedToday.current = true;
        lastRecordedDate.current = today;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 User activity recorded (${source}):`, result);
        }
      }
      
      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to record user activity:', error);
      }
    } finally {
      isRecording.current = false;
    }
  };

  useEffect(() => {
    if (!enabled || status !== 'authenticated') return;

    // Use IST to match the server and the recordActivity logic.
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Try to restore state from localStorage to persist across reloads
    try {
      const persistedDate = localStorage.getItem('last_recorded_activity_date');
      if (persistedDate === today) {
        hasRecordedToday.current = true;
        lastRecordedDate.current = today;
      } else if (lastRecordedDate.current !== today) {
        // Reset if date changed
        hasRecordedToday.current = false;
      }
    } catch (e) {
      // localStorage might be blocked
    }

    // Record activity on mount (only once per day)
    if (recordOnMount && !hasRecordedToday.current) {
      recordActivity('mount').then(result => {
        if (result?.success) {
          try {
            localStorage.setItem('last_recorded_activity_date', today);
          } catch (e) {}
        }
      });
    }

    // Record activity on window focus
    const handleFocus = () => {
      if (recordOnFocus && !hasRecordedToday.current) {
        recordActivity('focus').then(result => {
          if (result?.success) {
            try {
              localStorage.setItem('last_recorded_activity_date', today);
            } catch (e) {}
          }
        });
      }
    };

    // Record activity on visibility change (tab becomes visible)
    const handleVisibilityChange = () => {
      if (recordOnVisibilityChange && !document.hidden && !hasRecordedToday.current) {
        recordActivity('visibility').then(result => {
          if (result?.success) {
            try {
              localStorage.setItem('last_recorded_activity_date', today);
            } catch (e) {}
          }
        });
      }
    };

    // Add event listeners
    if (recordOnFocus) {
      window.addEventListener('focus', handleFocus);
    }
    
    if (recordOnVisibilityChange) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Cleanup
    return () => {
      if (recordOnFocus) {
        window.removeEventListener('focus', handleFocus);
      }
      
      if (recordOnVisibilityChange) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [enabled, status, session, recordOnMount, recordOnFocus, recordOnVisibilityChange]);

  // This component renders nothing - it just tracks activity
  return null;
}
