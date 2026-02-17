import api from './axios';

export interface AuthResponse {
    token: string;
    username: string;
    userId: number;
}

export const registerUser = async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', { username, email, password });
    return data;
};

export const loginUser = async (username: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
    return data;
};
