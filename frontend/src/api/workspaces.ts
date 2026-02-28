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

export interface WorkspaceInvite {
    token: string;
    role: string;
    workspaceId: number;
    workspaceName: string;
    createdAt: string;
    expiresAt: string | null;
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

export const addWorkspaceMember = async (workspaceId: number, username: string, role: string = 'Member') => {
    const response = await api.post<WorkspaceMember>(`/workspaces/${workspaceId}/members`, { username, role });
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

export const createWorkspaceInvite = async (workspaceId: number, role: string, expiresInDays?: number) => {
    const response = await api.post<WorkspaceInvite>(`/workspaces/${workspaceId}/invites`, { role, expiresInDays });
    return response.data;
};

export const getWorkspaceInvite = async (token: string) => {
    const response = await api.get<WorkspaceInvite>(`/workspaces/invite/${token}`);
    return response.data;
};

export const joinWorkspaceByToken = async (token: string) => {
    const response = await api.post<{ message: string, workspaceId: number }>(`/workspaces/join/${token}`);
    return response.data;
};
