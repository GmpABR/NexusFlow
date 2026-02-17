import api from './axios';

export interface Workspace {
    id: number;
    name: string;
    description: string;
    ownerId: number;
    ownerName: string;
    createdAt: string;
    members: WorkspaceMember[];
}

export interface WorkspaceMember {
    userId: number;
    username: string;
    role: string;
    status: 'Pending' | 'Accepted';
    joinedAt: string;
}

export interface CreateWorkspaceDto {
    name: string;
    description: string;
}

export const getMyWorkspaces = async () => {
    const response = await api.get<Workspace[]>('/workspaces');
    return response.data;
};

export const createWorkspace = async (data: CreateWorkspaceDto) => {
    const response = await api.post<Workspace>('/workspaces', data);
    return response.data;
};

export const getWorkspaceBoards = async (id: number) => {
    const response = await api.get(`/workspaces/${id}/boards`);
    return response.data;
};

export const getWorkspace = async (id: number) => {
    const response = await api.get<Workspace>(`/workspaces/${id}`);
    return response.data;
};

export const addWorkspaceMember = async (workspaceId: number, username: string) => {
    const response = await api.post<WorkspaceMember>(`/workspaces/${workspaceId}/members`, { username });
    return response.data;
};

export const removeWorkspaceMember = async (workspaceId: number, userId: number) => {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
};

export const getWorkspaceInvitations = async () => {
    const response = await api.get<Workspace[]>('/workspaces/invitations');
    return response.data;
};

export const respondToWorkspaceInvitation = async (workspaceId: number, accept: boolean) => {
    await api.post(`/workspaces/${workspaceId}/respond`, { accept });
};
