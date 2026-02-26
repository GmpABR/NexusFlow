import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5145/api';

export interface Automation {
    id: number;
    boardId: number;
    triggerType: string;
    triggerCondition: string;
    actionType: string;
    actionValue: string;
    createdAt: string;
}

export interface CreateAutomationDto {
    triggerType: string;
    triggerCondition: string;
    actionType: string;
    actionValue: string;
}

export const getAutomations = async (boardId: number): Promise<Automation[]> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/boards/${boardId}/automations`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const createAutomation = async (boardId: number, data: CreateAutomationDto): Promise<Automation> => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/boards/${boardId}/automations`, data, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const deleteAutomation = async (automationId: number): Promise<void> => {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_URL}/automations/${automationId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
};
