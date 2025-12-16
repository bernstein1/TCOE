import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private client: AxiosInstance;
  private sessionToken: string | null = null;
  private clerkToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add tokens
    this.client.interceptors.request.use((config) => {
      // Add Session Token (for anonymous flows)
      if (this.sessionToken) {
        config.headers['X-Session-Token'] = this.sessionToken;
      }

      // Add Clerk Token (for authenticated flows)
      if (this.clerkToken) {
        config.headers['Authorization'] = `Bearer ${this.clerkToken}`;
      }

      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle 401
          // Note: Clerk handles its own token refresh/expiry, so we mainly check for session expiry here
          // or if the backend explicitly rejects the token.
          console.warn('API Unauthorized:', error.response?.data);
        }
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  setSessionToken(token: string | null) {
    this.sessionToken = token;
  }

  setClerkToken(token: string | null) {
    this.clerkToken = token;
  }

  // Company
  async getCompany(slug: string) {
    const { data } = await this.client.get(`/companies/${slug}`);
    return data.company;
  }

  // Sessions
  async createSession(companySlug: string, mode: string, language: string, enrollmentType: string) {
    const { data } = await this.client.post('/sessions', {
      companySlug,
      mode,
      language,
      enrollmentType,
    });
    this.sessionToken = data.session.session_token;
    return data.session;
  }

  async getSession(id: string) {
    const { data } = await this.client.get(`/sessions/${id}`);
    return data.session;
  }

  async updateSession(id: string, updates: Record<string, any>) {
    const { data } = await this.client.put(`/sessions/${id}`, updates);
    return data.session;
  }

  // Plans
  async getPlans(companyId?: string) {
    const params = companyId ? { companyId } : {};
    const { data } = await this.client.get('/plans', { params });
    return data.plans;
  }

  async getPlan(id: string) {
    const { data } = await this.client.get(`/plans/${id}`);
    return data.plan;
  }

  // Recommendations
  async getRecommendations(profile: any) {
    const { data } = await this.client.post('/recommendations', { profile });
    return data;
  }

  // Prescriptions
  async searchPrescriptions(query: string, companyId?: string) {
    const params: Record<string, string> = { q: query };
    if (companyId) params.companyId = companyId;
    const { data } = await this.client.get('/prescriptions/search', { params });
    return data.prescriptions;
  }

  async getPrescriptionAlternatives(id: string, companyId?: string) {
    const params = companyId ? { companyId } : {};
    const { data } = await this.client.get(`/prescriptions/${id}/alternatives`, { params });
    return data.alternatives;
  }

  // Audio
  async getStepAudio(step: number, language: string = 'en') {
    const { data } = await this.client.get(`/audio/step/${step}`, {
      params: { language },
    });
    return data;
  }

  // PDF Export
  async exportPdf(sessionId: string, options: Record<string, boolean> = {}) {
    const { data } = await this.client.post(
      '/export/pdf',
      { sessionId, ...options },
      { responseType: 'blob' }
    );
    return data;
  }

  // Chat
  async sendChatMessage(message: string, context?: Record<string, any>) {
    const { data } = await this.client.post('/chat', { message, context });
    return data;
  }

  // Analytics
  async trackEvent(eventType: string, eventData: Record<string, any> = {}) {
    await this.client.post('/analytics/events', { eventType, eventData });
  }

  // Feature Flags
  async getFeatureFlags(sessionId?: string) {
    const params = sessionId ? { sessionId } : {};
    const { data } = await this.client.get('/analytics/feature-flags', { params });
    return data.flags;
  }

  // Enrollment
  async createEnrollment(enrollment: Record<string, any>) {
    const { data } = await this.client.post('/enrollments', enrollment);
    return data.enrollment;
  }

  // Auth - User Info
  async getCurrentUser() {
    const { data } = await this.client.get('/auth/me');
    return data.user;
  }
}

export const api = new ApiService();
export default api;

