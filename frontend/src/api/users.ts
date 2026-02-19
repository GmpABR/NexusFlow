import api from './axios';

export interface UserSummary {
    id: number;
    username: string;
    email: string;
    avatarUrl?: string | null;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    avatarUrl?: string | null;
    fullName?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    organization?: string | null;
    location?: string | null;
    bio?: string | null;
    createdAt: string;
}

export interface MyTask {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    dueDate: string | null;
    storyPoints: number | null;
    tags: string | null;
    columnId: number;
    columnName: string;
    boardId: number;
    boardName: string;
}

export const searchUsers = async (query: string): Promise<UserSummary[]> => {
    const response = await api.get<UserSummary[]>('/users/search', {
        params: { query }
    });
    return response.data;
};

export const getMe = async (): Promise<UserProfile> => {
    const { data } = await api.get<UserProfile>('/users/me');
    return data;
};

export const updateProfile = async (updates: Partial<{
    avatarUrl: string;
    username: string;
    fullName: string;
    jobTitle: string;
    department: string;
    organization: string;
    location: string;
    bio: string;
}>): Promise<UserProfile> => {
    const { data } = await api.put<UserProfile>('/users/me', updates);
    return data;
};

export const getMyTasks = async (): Promise<MyTask[]> => {
    const { data } = await api.get<MyTask[]>('/users/me/tasks');
    return data;
};
