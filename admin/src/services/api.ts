import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
    private client: AxiosInstance;
    private clerkToken: string | null = null;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor to add Clerk token
        this.client.interceptors.request.use((config) => {
            if (this.clerkToken) {
                config.headers['Authorization'] = `Bearer ${this.clerkToken}`;
            }
            return config;
        });

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    console.warn('Admin API Unauthorized');
                    // Redirect to login if needed, or let the UI handle it
                }
                throw error;
            }
        );
    }

    setClerkToken(token: string | null) {
        this.clerkToken = token;
    }

    // Dashboard
    async getDashboardStats() {
        const { data } = await this.client.get('/admin/dashboard');
        return data;
    }

    // Plans
    async getPlans() {
        const { data } = await this.client.get('/plans'); // Public/Shared endpoint
        return data.plans;
    }

    async createPlan(plan: any) {
        const { data } = await this.client.post('/admin/plans', plan);
        return data.plan;
    }

    async updatePlan(id: string, updates: any) {
        const { data } = await this.client.put(`/admin/plans/${id}`, updates);
        return data.plan;
    }

    async deletePlan(id: string) {
        await this.client.delete(`/admin/plans/${id}`);
    }

    // Analytics
    async getFunnelMetrics(startDate?: Date, endDate?: Date) {
        const params = { startDate, endDate };
        const { data } = await this.client.get('/analytics/funnel', { params });
        return data.metrics;
    }

    async getExperimentResults(id: string) {
        const { data } = await this.client.get(`/analytics/experiments/${id}`);
        return data;
    }

    // Employees
    async getEmployees() {
        const { data } = await this.client.get('/admin/employees');
        return data.employees;
    }
}

export const api = new ApiService();
export default api;
