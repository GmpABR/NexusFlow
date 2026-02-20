import api from './axios';

export interface BoardAnalytics {
    boardId: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    burnDownData: Record<string, number>;
    userTimeData: Record<string, number>;
}

export const getBoardAnalytics = async (boardId: number): Promise<BoardAnalytics> => {
    const { data } = await api.get<BoardAnalytics>(`/analytics/board/${boardId}`);
    return data;
};
