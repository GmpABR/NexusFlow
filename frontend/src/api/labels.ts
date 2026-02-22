import api from './axios';

export interface Label {
    id: number;
    name: string;
    color: string;
    boardId: number;
}

export interface CreateLabelDto {
    name: string;
    color: string;
}

export interface UpdateLabelDto {
    name?: string;
    color?: string;
}

export const getBoardLabels = async (boardId: number): Promise<Label[]> => {
    const response = await api.get(`/labels/board/${boardId}`);
    return response.data;
};

export const createLabel = async (boardId: number, dto: CreateLabelDto): Promise<Label> => {
    const response = await api.post(`/labels/board/${boardId}`, dto);
    return response.data;
};

export const updateLabel = async (id: number, dto: UpdateLabelDto): Promise<Label> => {
    const response = await api.put(`/labels/${id}`, dto);
    return response.data;
};

export const deleteLabel = async (id: number): Promise<void> => {
    await api.delete(`/labels/${id}`);
};

export const addTaskLabel = async (taskId: number, labelId: number): Promise<void> => {
    await api.post(`/tasks/${taskId}/labels/${labelId}`);
};

export const removeTaskLabel = async (taskId: number, labelId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}/labels/${labelId}`);
};

export const setTaskLabels = async (taskId: number, labelIds: number[]): Promise<void> => {
    await api.post(`/tasks/${taskId}/labels`, labelIds);
};
