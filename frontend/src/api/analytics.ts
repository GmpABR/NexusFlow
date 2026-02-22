import api from './axios';

export interface BoardAnalytics {
    boardId: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    burnDownData: Record<string, number>;
    userTimeData: Record<string, number>;
    averageLeadTimeDays: number;
    averageCycleTimeDays: number;
}

export interface WorkspaceActivity {
    username: string;
    avatarUrl?: string | null;
    action: string;
    details: string;
    taskTitle: string;
    boardName: string;
    timestamp: string;
}

export interface WorkspaceAnalytics {
    workspaceId: number;
    totalBoards: number;
    totalMembers: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    tasksByPriority: Record<string, number>;
    tasksByAssignee: Record<string, number>;
    tasksPerBoard: Record<string, number>;
    recentActivity: WorkspaceActivity[];
    averageLeadTimeDays: number;
    averageCycleTimeDays: number;
}

export const getBoardAnalytics = async (boardId: number): Promise<BoardAnalytics> => {
    const { data } = await api.get<BoardAnalytics>(`/analytics/board/${boardId}`);
    return data;
};

export const getWorkspaceAnalytics = async (workspaceId: number): Promise<WorkspaceAnalytics> => {
    const { data } = await api.get<WorkspaceAnalytics>(`/analytics/workspace/${workspaceId}`);
    return data;
};
