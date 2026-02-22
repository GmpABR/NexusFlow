import { useEffect, useRef, useCallback } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr';
import type { TaskCard, BoardMember } from '../api/boards';
import type { Label } from '../api/labels';

const HUB_URL = 'http://localhost:5145/hubs/board';

export function useSignalR(boardId: number | null, callbacks: {
    onTaskCreated?: (task: TaskCard) => void;
    onTaskMoved?: (task: TaskCard) => void;
    onTaskDeleted?: (taskId: number) => void;
    onTaskUpdated?: (task: TaskCard) => void;
    onMemberJoined?: (member: BoardMember) => void;
    onMemberRemoved?: (userId: number) => void;
    onLabelCreated?: (label: Label) => void;
    onLabelUpdated?: (label: Label) => void;
    onLabelDeleted?: (labelId: number) => void;
}) {
    const connectionRef = useRef<HubConnection | null>(null);
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    useEffect(() => {
        if (!boardId) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const connection = new HubConnectionBuilder()
            .withUrl(HUB_URL, { accessTokenFactory: () => token })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Information)
            .build();

        connectionRef.current = connection;

        connection.on('TaskCreated', (task: TaskCard) => {
            callbacksRef.current.onTaskCreated?.(task);
        });

        connection.on('TaskMoved', (task: TaskCard) => {
            callbacksRef.current.onTaskMoved?.(task);
        });

        connection.on('TaskDeleted', (taskId: number) => {
            callbacksRef.current.onTaskDeleted?.(taskId);
        });

        connection.on('TaskUpdated', (task: TaskCard) => {
            callbacksRef.current.onTaskUpdated?.(task);
        });

        connection.on('MemberJoined', (member: BoardMember) => {
            console.log('MemberJoined received:', member);
            callbacksRef.current.onMemberJoined?.(member);
        });

        connection.on('UserJoined', (username: string) => {
            console.log('User joined board channel:', username);
        });

        connection.on('MemberRemoved', (userId: number) => {
            callbacksRef.current.onMemberRemoved?.(userId);
        });

        connection.on('LabelCreated', (label: Label) => {
            callbacksRef.current.onLabelCreated?.(label);
        });

        connection.on('LabelUpdated', (label: Label) => {
            callbacksRef.current.onLabelUpdated?.(label);
        });

        connection.on('LabelDeleted', (labelId: number) => {
            callbacksRef.current.onLabelDeleted?.(labelId);
        });

        connection
            .start()
            .then(() => {
                connection.invoke('JoinBoard', boardId.toString());
            })
            .catch((err) => console.error('SignalR connection error:', err));

        return () => {
            if (connection.state === 'Connected') {
                connection.invoke('LeaveBoard', boardId.toString()).catch(() => { });
            }
            connection.stop();
        };
    }, [boardId]);

    const isConnected = useCallback(() => {
        return connectionRef.current?.state === 'Connected';
    }, []);

    return { isConnected };
}
