import { useCallback, useEffect, useRef, useState } from 'react';
import { dbFacadeClient } from '../lib/dbFacadeClient';
import type { ChatMessage } from '../api/partner';

export function usePartnerRealtimeChat(matchId: number | null) {
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([]);
  const seenIds = useRef(new Set<number>());

  useEffect(() => {
    if (!matchId || !dbFacadeClient) return;
    seenIds.current.clear();
    setRealtimeMessages([]);

    const channel = dbFacadeClient
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (seenIds.current.has(msg.id)) return;
          seenIds.current.add(msg.id);
          setRealtimeMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => {
      void dbFacadeClient.removeChannel(channel);
    };
  }, [matchId]);

  const markSeen = useCallback((ids: number[]) => {
    for (const id of ids) seenIds.current.add(id);
  }, []);

  return { realtimeMessages, markSeen };
}
