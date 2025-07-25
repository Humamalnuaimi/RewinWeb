// API service for making HTTP requests to the backend
const API_BASE_URL = '/api';

// Generic API call function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('adminToken');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  verify: async (token: string) => {
    return apiCall('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
};

// Analytics API
export const analyticsAPI = {
  getOverview: async () => {
    return apiCall('/analytics/overview');
  },

  getAllOutlets: async () => {
    return apiCall('/analytics/outlets');
  },

  getUserOutlets: async (userId: string) => {
    return apiCall(`/analytics/users/${userId}/outlets`);
  },

  getOutletDetails: async (outletId: string, userId: string) => {
    return apiCall(`/analytics/outlets/${outletId}?userId=${userId}`);
  },

  getAllCustomers: async () => {
    return apiCall('/analytics/customers');
  },

  getUserCustomers: async (userId: string) => {
    return apiCall(`/analytics/users/${userId}/customers`);
  },

  // Debug endpoints
  debugAllOutlets: async () => {
    return apiCall('/analytics/debug/all-outlets');
  },

  debugUserOutlets: async (email: string) => {
    return apiCall(`/analytics/debug/outlets/${email}`);
  },
};

// Users API
export const usersAPI = {
  getAll: async (limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiCall(`/users${params}`);
  },

  getById: async (userId: string) => {
    return apiCall(`/users/${userId}`);
  },

  delete: async (userId: string) => {
    return apiCall(`/users/${userId}`, {
      method: 'DELETE',
    });
  },

  update: async (userId: string, data: any) => {
    return apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Outlets API
export const outletsAPI = {
  getAll: async () => {
    return apiCall('/analytics/outlets');
  },

  getByUser: async (userId: string) => {
    return apiCall(`/analytics/users/${userId}/outlets`);
  },

  getById: async (outletId: string, userId: string) => {
    return apiCall(`/analytics/outlets/${outletId}?userId=${userId}`);
  },

  delete: async (outletId: string, userId: string) => {
    return apiCall(`/analytics/outlets/${outletId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  },

  update: async (outletId: string, userId: string, data: any) => {
    return apiCall(`/analytics/outlets/${outletId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...data }),
    });
  },

  create: async (userId: string, data: any) => {
    return apiCall(`/analytics/users/${userId}/outlets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Customers API
export const customersAPI = {
  getAll: async () => {
    return apiCall('/analytics/customers');
  },

  getByUser: async (userId: string) => {
    return apiCall(`/analytics/users/${userId}/customers`);
  },

  getById: async (customerId: string, userId: string) => {
    return apiCall(`/analytics/customers/${customerId}?userId=${userId}`);
  },

  delete: async (customerId: string, userId: string) => {
    return apiCall(`/analytics/customers/${customerId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  },

  update: async (customerId: string, userId: string, data: any) => {
    return apiCall(`/analytics/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...data }),
    });
  },

  create: async (userId: string, data: any) => {
    return apiCall(`/analytics/users/${userId}/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default {
  auth: authAPI,
  analytics: analyticsAPI,
  users: usersAPI,
  outlets: outletsAPI,
  customers: customersAPI,
}; 