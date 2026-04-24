import { describe, it, expect } from 'vitest';
import { getOptimalConnection } from './example';
import { mockPlexServer } from '../../tests/utils/mock-data';

describe('getOptimalConnection', () => {
  it('returns local connection when available', () => {
    const result = getOptimalConnection(mockPlexServer);
    expect(result).toBe('https://192.168.1.100:32400');
  });

  it('returns first connection when no local connection', () => {
    const server = {
      ...mockPlexServer,
      connections: [
        {
          protocol: 'https' as const,
          address: 'remote.example.com',
          port: 32400,
          local: false,
          relay: false,
          uri: 'https://remote.example.com:32400',
        },
      ],
    };
    const result = getOptimalConnection(server);
    expect(result).toBe('https://remote.example.com:32400');
  });

  it('throws error when no connections available', () => {
    const server = {
      ...mockPlexServer,
      connections: [],
    };
    expect(() => getOptimalConnection(server)).toThrow(
      'No connections available for server'
    );
  });
});
