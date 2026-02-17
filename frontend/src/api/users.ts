import api from './axios';

export interface UserSummary {
    id: number;
    username: string;
    email: string;
}

export const searchUsers = async (query: string) => {
    const response = await api.get<UserSummary[]>('/users/search', {
        params: { query }
    });
    return response.data;
};
