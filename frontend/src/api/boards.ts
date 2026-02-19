import api from './axios';
import type { Subtask } from './tasks';

export interface BoardSummary {
    id: number;
    name: string;
    createdAt: string;
    role: string;
    themeColor: string;
    workspaceId: number | null;
}

export interface TaskCard {
    id: number;
    title: string;
    description: string | null;
    order: number;
    columnId: number;
    createdAt: string;
    priority: string;
    dueDate: string | null;
    storyPoints: number | null;
    assigneeId: number | null;
    assigneeName: string | null;
    tags: string | null;
    subtasks?: Subtask[];
}

export interface Column {
    id: number;
    name: string;
    order: number;
    taskCards: TaskCard[];
}

export interface BoardMember {
    id: number;
    userId: number;
    username: string;
    email: string;
    role: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
    joinedAt: string;
}

export interface BoardDetail {
    id: number;
    name: string;
    createdAt: string;
    ownerId: number;
    themeColor: string;
    workspaceId: number | null;
    columns: Column[];
    members: BoardMember[];
    userRole: string;
}

export const getBoards = async (): Promise<BoardSummary[]> => {
    const { data } = await api.get<BoardSummary[]>('/boards');
    return data;
};

export const getPendingInvitations = async (): Promise<BoardSummary[]> => {
    const { data } = await api.get<BoardSummary[]>('/boards/invitations');
    return data;
};

export const createBoard = async (name: string, workspaceId?: number, themeColor?: string): Promise<BoardSummary> => {
    const { data } = await api.post<BoardSummary>('/boards', { name, workspaceId, themeColor });
    return data;
};

export const getBoardDetail = async (id: number): Promise<BoardDetail> => {
    const { data } = await api.get<BoardDetail>(`/boards/${id}`);
    return data;
};

export const getBoardMembers = async (boardId: number): Promise<BoardMember[]> => {
    const { data } = await api.get<BoardMember[]>(`/boards/${boardId}/members`);
    return data;
};

export const respondToInvitation = async (boardId: number, accept: boolean): Promise<void> => {
    await api.post(`/boards/${boardId}/invitations/respond`, { accept });
};

export const inviteMember = async (boardId: number, username: string): Promise<BoardMember> => {
    const { data } = await api.post<BoardMember>(`/boards/${boardId}/members`, { username });
    return data;
};

export const removeMember = async (boardId: number, userId: number): Promise<void> => {
    await api.delete(`/boards/${boardId}/members/${userId}`);
};

export const updateBoard = async (boardId: number, data: { name?: string; themeColor?: string; backgroundImageUrl?: string }): Promise<BoardDetail> => {
    const { data: updatedBoard } = await api.put<BoardDetail>(`/boards/${boardId}`, data);
    return updatedBoard;
};
