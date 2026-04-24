import axios from 'axios';
import type { UserInfo } from '@/types';

/**
 * PIN response from Plex.tv
 */
export interface PinResponse {
  id: number;
  code: string;
  expiresAt: string;
}

/**
 * Authentication token response
 */
export interface AuthToken {
  token: string;
  expiresAt?: string;
}

/**
 * Plex Home user
 */
export interface HomeUser {
  id: string;
  title: string;
  username?: string;
  thumb: string;
  admin: boolean;
  restricted: boolean;
  guest: boolean;
}

/**
 * Authentication Manager Interface
 */
export interface IAuthenticationManager {
  // PIN-based OAuth flow
  generatePin(): Promise<PinResponse>;
  pollPinStatus(pinId: number, code: string): Promise<AuthToken | null>;

  // Token management
  validateToken(token: string): Promise<boolean>;
  storeToken(userId: string, token: string): Promise<void>;
  getToken(userId: string): Promise<string | null>;
  clearTokens(): Promise<void>;

  // User info
  getUserInfo(token: string): Promise<UserInfo>;
  getHomeUsers(adminToken: string): Promise<HomeUser[]>;
  switchUser(adminToken: string, userId: string): Promise<AuthToken>;
}

/**
 * Authentication Manager Implementation
 * Handles PIN-based OAuth flow with Plex.tv and token management
 */
export class AuthenticationManager implements IAuthenticationManager {
  private readonly PLEX_TV_URL = 'https://plex.tv';
  private readonly CLIENT_IDENTIFIER: string;
  private readonly PRODUCT_NAME: string;

  constructor() {
    this.CLIENT_IDENTIFIER =
      import.meta.env.VITE_PLEX_CLIENT_IDENTIFIER || 'aio-media-manager';
    this.PRODUCT_NAME =
      import.meta.env.VITE_PLEX_PRODUCT || 'AIO Media Manager';
  }

  /**
   * Generate a PIN for OAuth authentication
   */
  async generatePin(): Promise<PinResponse> {
    const response = await axios.post(
      `${this.PLEX_TV_URL}/api/v2/pins?strong=true`,
      {},
      {
        headers: {
          'X-Plex-Product': this.PRODUCT_NAME,
          'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
        },
      }
    );

    return {
      id: response.data.id,
      code: response.data.code,
      expiresAt: response.data.expiresAt,
    };
  }

  /**
   * Poll PIN status to check if user has authenticated
   */
  async pollPinStatus(pinId: number, code: string): Promise<AuthToken | null> {
    try {
      const response = await axios.get(
        `${this.PLEX_TV_URL}/api/v2/pins/${pinId}?code=${code}`,
        {
          headers: {
            'X-Plex-Product': this.PRODUCT_NAME,
            'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
          },
        }
      );

      if (response.data.authToken) {
        return {
          token: response.data.authToken,
        };
      }

      return null;
    } catch (error) {
      // PIN not claimed yet or expired
      return null;
    }
  }

  /**
   * Validate an authentication token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      await axios.get(`${this.PLEX_TV_URL}/api/v2/user`, {
        headers: {
          'X-Plex-Token': token,
          'X-Plex-Product': this.PRODUCT_NAME,
          'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Store authentication token securely
   */
  async storeToken(userId: string, token: string): Promise<void> {
    // Store in localStorage for web, will be enhanced for Electron with secure storage
    const tokens = this.getStoredTokens();
    tokens[userId] = token;
    localStorage.setItem('plex_tokens', JSON.stringify(tokens));
  }

  /**
   * Retrieve authentication token
   */
  async getToken(userId: string): Promise<string | null> {
    const tokens = this.getStoredTokens();
    return tokens[userId] || null;
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    localStorage.removeItem('plex_tokens');
  }

  /**
   * Get user information
   */
  async getUserInfo(token: string): Promise<UserInfo> {
    const response = await axios.get(`${this.PLEX_TV_URL}/api/v2/user`, {
      headers: {
        'X-Plex-Token': token,
        'X-Plex-Product': this.PRODUCT_NAME,
        'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
      },
    });

    return {
      id: response.data.id,
      username: response.data.username,
      email: response.data.email,
      thumb: response.data.thumb,
      isAdmin: !response.data.restricted,
      isRestricted: response.data.restricted || false,
    };
  }

  /**
   * Get Plex Home users
   */
  async getHomeUsers(adminToken: string): Promise<HomeUser[]> {
    const response = await axios.get(
      `${this.PLEX_TV_URL}/api/v2/home/users`,
      {
        headers: {
          'X-Plex-Token': adminToken,
          'X-Plex-Product': this.PRODUCT_NAME,
          'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
        },
      }
    );

    return response.data.map((user: any) => ({
      id: user.id,
      title: user.title,
      username: user.username,
      thumb: user.thumb,
      admin: user.admin === 1,
      restricted: user.restricted === 1,
      guest: user.guest === 1,
    }));
  }

  /**
   * Switch to a different Plex Home user
   */
  async switchUser(adminToken: string, userId: string): Promise<AuthToken> {
    const response = await axios.post(
      `${this.PLEX_TV_URL}/api/v2/home/users/${userId}/switch`,
      {},
      {
        headers: {
          'X-Plex-Token': adminToken,
          'X-Plex-Product': this.PRODUCT_NAME,
          'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
        },
      }
    );

    return {
      token: response.data.authToken,
    };
  }

  /**
   * Helper: Get stored tokens from localStorage
   */
  private getStoredTokens(): Record<string, string> {
    const stored = localStorage.getItem('plex_tokens');
    return stored ? JSON.parse(stored) : {};
  }
}

// Export singleton instance
export const authManager = new AuthenticationManager();
