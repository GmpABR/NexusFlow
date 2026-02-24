import api from './axios';
import type { Subtask } from './tasks';
import type { Label } from './labels';

export interface BoardSummary {
    id: number;
    name: string;
    createdAt: string;
    role: string;
    themeColor: string;
    workspaceId: number | null;
    isClosed: boolean;
}

export interface Attachment {
    id: number;
    taskCardId: number;
    uploadedById: number;
    uploadedByUsername: string;
    fileName: string;
    storagePath: string;
    publicUrl: string;
    contentType: string;
    fileSizeBytes: number;
    uploadedAt: string;
}

export interface TaskCard {
    id: number;
    title: string;
    description: string | null;
    order: number;
    columnId: number;
    boardId: number;
    createdAt: string;
    priority: string;
    dueDate: string | null;
    storyPoints: number | null;
    assigneeId: number | null;
    assigneeName: string | null;
    assignees?: { userId: number; username: string; avatarUrl?: string | null }[];
    tags: string | null;
    totalTimeSpentMinutes: number;
    isTimerRunning: boolean;
    subtasks?: Subtask[];
    attachments?: Attachment[];
    labels?: Label[];
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
    avatarUrl?: string | null;
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
    labels: Label[];
    userRole: string;
    isClosed: boolean;
}

export const getBoards = async (): Promise<BoardSummary[]> => {
    const { data } = await api.get<BoardSummary[]>('/boards');
    return data;
};

export const getPendingInvitations = async (): Promise<BoardSummary[]> => {
    const { data } = await api.get<BoardSummary[]>('/boards/invitations');
    return data;
};

export const createBoard = async (name: string, workspaceId?: number, themeColor?: string, skipDefaultColumns: boolean = false): Promise<BoardSummary> => {
    const { data } = await api.post<BoardSummary>('/boards', { name, workspaceId, themeColor, skipDefaultColumns });
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

export const createColumn = async (boardId: number, name: string): Promise<Column> => {
    const { data } = await api.post<Column>(`/boards/${boardId}/columns`, { name });
    return data;
};

export const moveColumn = async (boardId: number, columnId: number, newOrder: number): Promise<void> => {
    await api.put(`/boards/${boardId}/columns/${columnId}/move`, { newOrder });
};

export const deleteColumn = async (boardId: number, columnId: number): Promise<void> => {
    await api.delete(`/boards/${boardId}/columns/${columnId}`);
};

export const updateColumn = async (boardId: number, columnId: number, name: string): Promise<Column> => {
    const { data } = await api.put<Column>(`/boards/${boardId}/columns/${columnId}`, { name });
    return data;
};

export const closeBoard = async (boardId: number): Promise<void> => {
    await api.put(`/boards/${boardId}/close`);
};

export const reopenBoard = async (boardId: number): Promise<void> => {
    await api.put(`/boards/${boardId}/reopen`);
};

export const deleteBoard = async (boardId: number): Promise<void> => {
    await api.delete(`/boards/${boardId}`);
};
