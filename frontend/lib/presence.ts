'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getApiUrl } from './api';
import { useCurrentUser } from './auth';

export type PresenceUser = {
  id: string;
  name: string;
};

export function useDocumentPresence(documentId: string) {
  const { user } = useCurrentUser();
  const userId = user?.id;
  const [viewers, setViewers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const socket: Socket = io(getApiUrl(), {
      auth: { userId },
    });

    const onPresence = (payload: { users?: PresenceUser[] }) => {
      setViewers(Array.isArray(payload?.users) ? payload.users : []);
    };

    socket.on('presence', onPresence);
    socket.on('connect', () => {
      socket.emit('joinDocument', documentId);
    });

    return () => {
      socket.off('presence', onPresence);
      socket.emit('leaveDocument');
      socket.disconnect();
      setViewers([]);
    };
  }, [documentId, userId]);

  return viewers;
}
