import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Active channels keyed by game code */
const channels = new Map<string, RealtimeChannel>();

export type FlipCardPayload = { cardIndex: number; playerIndex: number };

/**
 * Set up Supabase Realtime for a game session.
 *
 * Two channels per game:
 *   1. postgres_changes on game_sessions — durable state (phase, turn, winner)
 *   2. postgres_changes on game_questions — new questions / answers
 *   3. broadcast on `game:{code}` — ephemeral flip_card events
 *
 * Returns a cleanup function.
 */
export function subscribeToGame(
  gameCode: string,
  gameSessionId: string,
  onStateChange: () => void,
  onFlipCard: (payload: FlipCardPayload) => void,
): () => void {
  // Clean up any existing subscription for this code
  unsubscribeFromGame(gameCode);

  const channel = supabase
    .channel(`game:${gameCode}`)
    // Durable: game session row changes (phase, turn, winner, etc.)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${gameSessionId}`,
      },
      () => onStateChange(),
    )
    // Durable: question log changes (new questions, answers recorded)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_questions',
        filter: `game_session_id=eq.${gameSessionId}`,
      },
      () => onStateChange(),
    )
    // Ephemeral: card flip broadcast (no server round-trip, no DB storage)
    .on('broadcast', { event: 'flip_card' }, ({ payload }) => {
      onFlipCard(payload as FlipCardPayload);
    })
    .subscribe();

  channels.set(gameCode, channel);

  return () => unsubscribeFromGame(gameCode);
}

/** Send an ephemeral flip_card broadcast to the other player */
export function broadcastFlipCard(gameCode: string, payload: FlipCardPayload): void {
  const channel = channels.get(gameCode);
  if (channel) {
    channel.send({ type: 'broadcast', event: 'flip_card', payload });
  }
}

/** Remove and unsubscribe a game channel */
export function unsubscribeFromGame(gameCode: string): void {
  const existing = channels.get(gameCode);
  if (existing) {
    supabase.removeChannel(existing);
    channels.delete(gameCode);
  }
}
