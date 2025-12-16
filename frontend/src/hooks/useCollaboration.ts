import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  name: string;
  joinedAt: number;
}

interface Cursor {
  x: number;
  y: number;
  timestamp: number;
}

interface CollaborationOptions {
  onSpouseJoined?: () => void;
  onComparisonReady?: (results: any) => void;
}

export function useCollaboration(options: CollaborationOptions = {}) {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [userId] = useState(() => uuidv4());
  const [users, setUsers] = useState<Record<string, User>>({});
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spouseJoined, setSpouseJoined] = useState(false);
  const [spouseProfile, setSpouseProfile] = useState<any>(null);
  const [comparisonResults, setComparisonResults] = useState<any>(null);

  const pollInterval = useRef<any>();

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const shareUrl = sessionCode ? `${window.location.origin}?join=${sessionCode}` : '';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      if (sessionCode) leaveSession();
    };
  }, [sessionCode]);

  // Poll for updates when connected
  useEffect(() => {
    if (!isConnected || !sessionCode) return;

    const poll = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/collaboration/state?sessionId=${sessionCode}`);
        if (!res.ok) throw new Error('Failed to fetch state');

        const data = await res.json();
        setUsers(data.users || {});
        setCursors(data.cursors || {});

        // Check for spouse
        const otherUsers = Object.values(data.users || {}).filter((u: any) => u.id !== userId);
        if (otherUsers.length > 0 && !spouseJoined) {
          setSpouseJoined(true);
          setSpouseProfile({ name: (otherUsers[0] as User).name }); // Mock profile for now
          options.onSpouseJoined?.();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollInterval.current = setInterval(poll, 2000);
    poll(); // Initial call

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [isConnected, sessionCode, userId, spouseJoined]);

  const createSession = useCallback(async () => {
    try {
      setError(null);
      const newSessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const res = await fetch(`${apiUrl}/api/collaboration/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionCode,
          userId,
          userName: 'Me'
        })
      });

      if (!res.ok) throw new Error('Failed to create session');

      setSessionCode(newSessionCode);
      setIsConnected(true);
    } catch (err) {
      setError('Failed to create session. Please try again.');
      console.error(err);
    }
  }, [userId, apiUrl]);

  const joinSession = useCallback(async (code: string) => {
    try {
      setError(null);
      const res = await fetch(`${apiUrl}/api/collaboration/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: code,
          userId,
          userName: 'Spouse'
        })
      });

      if (!res.ok) throw new Error('Failed to join session');

      setSessionCode(code);
      setIsConnected(true);
    } catch (err) {
      setError('Invalid session code or connection failed.');
      console.error(err);
    }
  }, [userId, apiUrl]);

  const leaveSession = useCallback(async () => {
    if (!sessionCode) return;

    try {
      await fetch(`${apiUrl}/api/collaboration/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionCode, userId })
      });

      setSessionCode(null);
      setIsConnected(false);
      setSpouseJoined(false);
      setUsers({});
    } catch (err) {
      console.error(err);
    }
  }, [sessionCode, userId, apiUrl]);

  const updateCursor = useCallback((x: number, y: number) => {
    if (!sessionCode || !isConnected) return;

    fetch(`${apiUrl}/api/collaboration/cursor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionCode, userId, x, y })
    }).catch(console.error);
  }, [sessionCode, userId, isConnected, apiUrl]);

  const requestComparison = useCallback(() => {
    // Mock comparison request for now
    setTimeout(() => {
      const results = {
        scenarios: [
          { name: 'Plan A', description: 'Best for you', totalCost: 1200, isBest: true },
          { name: 'Plan B', description: 'Alternative', totalCost: 1500, isBest: false }
        ]
      };
      setComparisonResults(results);
      options.onComparisonReady?.(results);
    }, 1000);
  }, [options]);

  return {
    isConnected,
    sessionCode,
    shareUrl,
    spouseJoined,
    spouseProfile,
    comparisonResults,
    error,
    users,
    cursors,
    createSession,
    joinSession,
    leaveSession,
    requestComparison,
    updateCursor
  };
}
