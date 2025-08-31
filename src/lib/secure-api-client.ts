import { getAuth } from 'firebase/auth';

interface ApiResponse {
  clientSecret?: string;
  paymentIntentId?: string;
  success?: boolean;
  creditsAdded?: number;
  [key: string]: unknown;
}

async function getAuthHeaders() {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const secureApiClient = {
  post: async (url: string, data: unknown, customHeaders?: Record<string, string>): Promise<ApiResponse> => {
    try {
      const authHeaders = await getAuthHeaders();
      const headers = { ...authHeaders, ...customHeaders };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in POST ${url}:`, error);
      throw error;
    }
  },
  
  get: async (url: string, customHeaders?: Record<string, string>): Promise<ApiResponse> => {
    try {
      const authHeaders = await getAuthHeaders();
      const headers = { ...authHeaders, ...customHeaders };

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in GET ${url}:`, error);
      throw error;
    }
  }
};