import api from './axios';

export interface TimeLog {
    id: number;
    taskCardId: number;
    userId: number;
    userName?: string;
    startedAt: string;
    stoppedAt?: string;
    durationMinutes?: number;
}

export const startTimer = async (taskCardId: number): Promise<TimeLog> => {
    const { data } = await api.post<TimeLog>('/timelogs/start', { taskCardId });
    return data;
};

export const stopTimer = async (taskCardId: number, stoppedAt?: string): Promise<TimeLog> => {
    const { data } = await api.post<TimeLog>(`/timelogs/stop?taskId=${taskCardId}`, { stoppedAt });
    return data;
};

export const addManualTimeLog = async (taskCardId: number, startedAt: string, stoppedAt: string): Promise<TimeLog> => {
    const { data } = await api.post<TimeLog>('/timelogs/manual', { taskCardId, startedAt, stoppedAt });
    return data;
};

export const getTaskTimeLogs = async (taskId: number): Promise<TimeLog[]> => {
    const { data } = await api.get<TimeLog[]>(`/timelogs/task/${taskId}`);
    return data;
};

export const deleteTimeLog = async (timeLogId: number): Promise<void> => {
    await api.delete(`/timelogs/${timeLogId}`);
};
