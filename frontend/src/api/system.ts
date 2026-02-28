import api from './axios';

export async function getErDiagram(): Promise<string> {
    const response = await api.get<{ plantUml: string }>('/System/er-diagram');
    return response.data.plantUml;
}
