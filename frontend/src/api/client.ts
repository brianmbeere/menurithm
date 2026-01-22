import { authFetch } from '../hooks/authFetch';

/**
 * Enhanced API Client for Menurithm
 * Supports both Firebase JWT authentication and API key authentication
 */
export class MenurithmAPIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:8001';
  }

  /**
   * Make service-to-service requests using API key authentication
   */
  async serviceRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': 'integration-key-456',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make authenticated requests using Firebase JWT
   */
  async authRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Use existing authFetch function for consistency
    const response = await authFetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make unauthenticated requests
   */
  async publicRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

// Singleton instance
export const apiClient = new MenurithmAPIClient();
