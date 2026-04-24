/**
 * Core type definitions for AIO Media Manager
 */

export type MediaType =
  | 'movie'
  | 'show'
  | 'season'
  | 'episode'
  | 'artist'
  | 'album'
  | 'track';

export interface PlexServer {
  machineIdentifier: string;
  name: string;
  version: string;
  connections: ServerConnection[];
  owned: boolean;
  home: boolean;
}

export interface ServerConnection {
  protocol: 'http' | 'https';
  address: string;
  port: number;
  local: boolean;
  relay: boolean;
  uri: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  thumb: string;
  isAdmin: boolean;
  isRestricted: boolean;
}
