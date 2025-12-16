import { useEffect, useState, useCallback } from 'react';

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

export function useCollaboration(sessionId: string, userId: string, userName: string) {
  const [users, setUsers] = useState<Record<string, User>>({});
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [isConnected, setIsConnected] = useState(false);

  // Join session on mount
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';

    fetch(`${apiUrl}/api/collaboration/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId, userName })
    }).then(() => setIsConnected(true));

    // Leave on unmount
    return () => {
      fetch(`${apiUrl}/api/collaboration/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId })
      });
    };
  }, [sessionId, userId, userName]);

  // Poll for state updates
  useEffect(() => {
    if (!isConnected) return;

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/collaboration/state?sessionId=${sessionId}`);
        const data = await res.json();
        setUsers(data.users);
        setCursors(data.cursors);
      } catch (error) {
        console.error('Failed to fetch collaboration state:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [isConnected, sessionId]);

  // Update cursor position
  const updateCursor = useCallback((x: number, y: number) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(`${apiUrl}/api/collaboration/cursor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId, x, y })
    });
  }, [sessionId, userId]);

  return { users, cursors, updateCursor, isConnected };
}
