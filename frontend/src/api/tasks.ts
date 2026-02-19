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

export interface Subtask {
    id: number;
    title: string;
    isCompleted: boolean;
}

export const createSubtask = async (taskId: number, title: string): Promise<Subtask> => {
    const { data } = await api.post<Subtask>(`/tasks/${taskId}/subtasks`, { title });
    return data;
};

export const updateSubtask = async (subtaskId: number, updates: { title?: string; isCompleted?: boolean }): Promise<Subtask> => {
    const { data } = await api.put<Subtask>(`/tasks/subtasks/${subtaskId}`, updates);
    return data;
};

export const deleteSubtask = async (subtaskId: number): Promise<void> => {
    await api.delete(`/tasks/subtasks/${subtaskId}`);
};

export interface TaskActivity {
    id: number;
    taskCardId: number;
    userId: number;
    user?: {
        id: number;
        username: string;
        email: string;
        avatarUrl?: string;
    };
    action: string;
    details: string;
    timestamp: string;
}

export const getTaskActivities = async (taskId: number): Promise<TaskActivity[]> => {
    const { data } = await api.get<TaskActivity[]>(`/tasks/${taskId}/activities`);
    return data;
};
