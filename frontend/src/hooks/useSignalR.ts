import { useEffect, useRef, useCallback } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr';
import type { TaskCard, BoardMember } from '../api/boards';
import type { Label } from '../api/labels';
import type { Notification } from '../api/notifications';

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
    onNotificationReceived?: (notification: Notification) => void;
    onUserOnline?: (userId: number) => void;
    onUserOffline?: (userId: number) => void;
    onBoardCreated?: (board: import('../api/boards').BoardSummary) => void;
    onBoardUpdated?: (board: import('../api/boards').BoardDetail) => void;
    onBoardClosed?: (boardId: number) => void;
    onBoardReopened?: (boardId: number) => void;
    onBoardDeleted?: (boardId: number) => void;
    onColumnCreated?: (column: import('../api/boards').Column) => void;
    onColumnMoved?: (event: { columnId: number, newOrder: number }) => void;
    onColumnUpdated?: (column: import('../api/boards').Column) => void;
    onColumnDeleted?: (columnId: number) => void;
    onBoardInvitationReceived?: () => void;
    onWorkspaceInvitationReceived?: (data: { workspaceId: number; workspaceName: string; role: string }) => void;
}) {
    const connectionRef = useRef<HubConnection | null>(null);
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    const token = localStorage.getItem('token');

    useEffect(() => {
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

        connection.on('ReceiveNotification', (notification: Notification) => {
            callbacksRef.current.onNotificationReceived?.(notification);
        });

        connection.on('UserOnline', (userId: number) => {
            callbacksRef.current.onUserOnline?.(userId);
        });

        connection.on('UserOffline', (userId: number) => {
            callbacksRef.current.onUserOffline?.(userId);
        });

        connection.on('BoardCreated', (board: import('../api/boards').BoardSummary) => {
            callbacksRef.current.onBoardCreated?.(board);
        });

        connection.on('BoardUpdated', (board: import('../api/boards').BoardDetail) => {
            callbacksRef.current.onBoardUpdated?.(board);
        });

        connection.on('BoardClosed', (boardId: number) => {
            callbacksRef.current.onBoardClosed?.(boardId);
        });

        connection.on('BoardReopened', (boardId: number) => {
            callbacksRef.current.onBoardReopened?.(boardId);
        });

        connection.on('BoardDeleted', (boardId: number) => {
            callbacksRef.current.onBoardDeleted?.(boardId);
        });

        connection.on('ColumnCreated', (column: import('../api/boards').Column) => {
            callbacksRef.current.onColumnCreated?.(column);
        });

        connection.on('ColumnMoved', (data: { columnId: number, newOrder: number }) => {
            callbacksRef.current.onColumnMoved?.(data);
        });

        connection.on('ColumnUpdated', (column: import('../api/boards').Column) => {
            callbacksRef.current.onColumnUpdated?.(column);
        });

        connection.on('ColumnDeleted', (columnId: number) => {
            callbacksRef.current.onColumnDeleted?.(columnId);
        });

        connection.on('BoardInvitationReceived', () => {
            callbacksRef.current.onBoardInvitationReceived?.();
        });

        connection.on('WorkspaceInvitationReceived', (data: { workspaceId: number; workspaceName: string; role: string }) => {
            callbacksRef.current.onWorkspaceInvitationReceived?.(data);
        });

        connection
            .start()
            .then(() => {
                if (boardId) {
                    connection.invoke('JoinBoard', boardId.toString());
                }
            })
            .catch((err) => console.error('SignalR connection error:', err));

        return () => {
            if (connection.state === 'Connected' && boardId) {
                connection.invoke('LeaveBoard', boardId.toString()).catch(() => { });
            }
            connection.stop();
        };
    }, [boardId, token]);

    const isConnected = useCallback(() => {
        return connectionRef.current?.state === 'Connected';
    }, []);

    return { isConnected };
}
