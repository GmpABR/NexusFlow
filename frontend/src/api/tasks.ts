import api from './axios';
import type { TaskCard } from './boards';

export const createTask = async (title: string, columnId: number, description?: string): Promise<TaskCard> => {
    const { data } = await api.post<TaskCard>('/tasks', { title, columnId, description });
    return data;
};

export const moveTask = async (taskId: number, targetColumnId: number, newOrder: number): Promise<TaskCard> => {
    const { data } = await api.put<TaskCard>(`/tasks/${taskId}/move`, { targetColumnId, newOrder });
    return data;
};

export interface UpdateTaskDto {
    title: string;
    description?: string | null;
    priority?: string;
    dueDate?: string | null;
    storyPoints?: number | null;
    assigneeId?: number | null;
    tags?: string | null;
}

export const updateTask = async (taskId: number, dto: UpdateTaskDto): Promise<TaskCard> => {
    const { data } = await api.put<TaskCard>(`/tasks/${taskId}`, dto);
    return data;
};

export const deleteTask = async (taskId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
};
