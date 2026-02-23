import api from './axios';

export interface Notification {
    id: number;
    message: string;
    type: string;
    relatedId?: number;
    isRead: boolean;
    createdAt: string;
}

export const getNotifications = async (): Promise<Notification[]> => {
    const response = await api.get('/notifications');
    return response.data;
};

export const markAsRead = async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
    await api.patch('/notifications/read-all');
};
