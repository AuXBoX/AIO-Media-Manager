/**
 * Example utility to demonstrate TypeScript strict mode and path aliases
 */

import type { PlexServer } from '@/types';

/**
 * Get the optimal connection for a Plex server
 * This demonstrates strict mode type checking
 */
export function getOptimalConnection(server: PlexServer): string {
  // Strict mode ensures we handle undefined/null cases
  const localConnection = server.connections.find((conn) => conn.local);

  if (localConnection) {
    return localConnection.uri;
  }

  // noUncheckedIndexedAccess ensures we check array access
  const firstConnection = server.connections[0];

  if (!firstConnection) {
    throw new Error('No connections available for server');
  }

  return firstConnection.uri;
}
