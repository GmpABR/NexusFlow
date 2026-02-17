import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Group,
    Text,
    ActionIcon,
    Loader,
    Center,
    Modal,
    TextInput,
    Button,
    Avatar,
    Badge,
    Stack,
    Paper,
    ThemeIcon,
    Menu,
} from '@mantine/core';
import {
    IconUserPlus,
    IconUsers,
    IconTrash,
    IconCheck,
    IconBriefcase,
    IconLogout,
    IconMail,
    IconCalendar,
    IconLayoutDashboard,
    IconExchange,
    IconTable,
    IconChevronDown,
    IconRotate,
    IconList,
    IconLocation,
} from '@tabler/icons-react';
import {
    DragDropContext,
    type DropResult,
    Droppable
} from '@hello-pangea/dnd';
import { notifications } from '@mantine/notifications';
import {
    getBoardDetail,
    getBoards,
    inviteMember,
    removeMember,
    updateBoard,
    type BoardDetail,
    type BoardSummary,
    type TaskCard as TaskCardType,
    type BoardMember,
} from '../api/boards';
import { createTask, moveTask, deleteTask } from '../api/tasks';
import { useSignalR } from '../hooks/useSignalR';
import BoardColumn from '../components/BoardColumn';
import TaskDetailModal from '../components/TaskDetailModal';
import BoardTableView from '../components/BoardTableView';
import BoardCalendarView from '../components/BoardCalendarView';
import BoardDashboardView from '../components/BoardDashboardView';
import BoardTimelineView from '../components/BoardTimelineView';
import { BOARD_THEMES, type ThemeColor } from '../constants/themes';

type ViewMode = 'board' | 'table' | 'calendar' | 'dashboard' | 'timeline' | 'map';

export default function BoardPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const boardId = id ? parseInt(id) : null;

    const [board, setBoard] = useState<BoardDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviting, setInviting] = useState(false);

    // Task Detail Modal State
    const [selectedTask, setSelectedTask] = useState<TaskCardType | null>(null);
    const [taskModalOpen, setTaskModalOpen] = useState(false);

    // Board Switcher State
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [allBoards, setAllBoards] = useState<BoardSummary[]>([]);
    const [fetchingBoards, setFetchingBoards] = useState(false);

    // Layout State
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isOwner = board ? (board as any).ownerId === user.id || board.members?.some(m => m.userId === user.id && m.role === 'Owner') : false;

    const fetchBoard = useCallback(async () => {
        if (!boardId) return;
        try {
            const data = await getBoardDetail(boardId);
            setBoard(data);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to load board.', color: 'red' });
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    const handleTaskMoveInternal = (task: TaskCardType) => {
        setBoard((prev) => {
            if (!prev) return prev;

            // Deep clone columns to modify
            const newColumns = prev.columns.map(col => ({
                ...col,
                taskCards: [...col.taskCards]
            }));

            // Find current location of the task
            let sourceColIndex = -1;
            let sourceTaskIndex = -1;

            newColumns.forEach((col, cIdx) => {
                const tIdx = col.taskCards.findIndex(t => t.id === task.id);
                if (tIdx !== -1) {
                    sourceColIndex = cIdx;
                    sourceTaskIndex = tIdx;
                }
            });

            // If not found, check if it's a new task to be inserted (e.g. from another user)
            // But usually move implies existing. If checks fail, return prev.
            if (sourceColIndex === -1 && !task.columnId) return prev;

            // If found, remove from old
            if (sourceColIndex !== -1) {
                newColumns[sourceColIndex].taskCards.splice(sourceTaskIndex, 1);
            }

            // Find target column
            const targetCol = newColumns.find(c => c.id === task.columnId);
            if (!targetCol) return prev; // Should not happen if data is consistent

            // Insert at new order
            // We use task.order as the index, clamped to bounds
            const insertIndex = Math.min(task.order, targetCol.taskCards.length);

            // Clone to ensure we have a new object reference in state
            const updatedTask = { ...task };
            targetCol.taskCards.splice(insertIndex, 0, updatedTask);

            return {
                ...prev,
                columns: newColumns
            };
        });
    };

    useEffect(() => {
        fetchBoard();
    }, [fetchBoard]);

    // ── SignalR real-time callbacks ──
    useSignalR(boardId, {
        onTaskCreated: (task: TaskCardType) => {
            setBoard((prev) => {
                if (!prev) return prev;
                // Check if task already exists to avoid duplication from optimistic/API updates
                const exists = prev.columns.some(col => col.taskCards.some(t => t.id === task.id));
                if (exists) return prev;

                return {
                    ...prev,
                    columns: prev.columns.map((col) =>
                        col.id === task.columnId
                            ? { ...col, taskCards: [...col.taskCards, task] }
                            : col
                    ),
                };
            });
        },
        onTaskMoved: (task: TaskCardType) => {
            if (isDraggingRef.current) return;
            handleTaskMoveInternal(task);
        },
        onTaskDeleted: (taskId: number) => {
            setBoard((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    columns: prev.columns.map((col) => ({
                        ...col,
                        taskCards: col.taskCards.filter((t) => t.id !== taskId),
                    })),
                };
            });
        },
        onTaskUpdated: (task: TaskCardType) => { // New SignalR event? Or handle locally + socket?
            // Assuming SignalR sends 'TaskUpdated' or re-using logic
            // But simpler to just update local state if I triggered it, and rely on socket for others
            // Wait, the hook allows custom events? No, I need to update useSignalR if I want real-time updates for details.
            // For now, let's just update local state on save and rely on fetchBoard or socket.
            // Wait, existing useSignalR doesn't support TaskUpdated. I should add it.
            // But for now, let's just handle local update.
            handleTaskUpdated(task);
        },
        onMemberJoined: (member: BoardMember) => {
            setBoard((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    members: [...(prev.members || []), member],
                };
            });
        },
        onMemberRemoved: (userId: number) => {
            setBoard((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    members: (prev.members || []).filter((m) => m.userId !== userId),
                };
            });
        },
    });

    // ── Add this for SignalR update (hacky without updating hook right now, but standard flow)
    // Actually I should update useSignalR later. 

    const handleTaskUpdated = (updatedTask: TaskCardType) => {
        setBoard((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                columns: prev.columns.map((col) => ({
                    ...col,
                    taskCards: col.taskCards.map((t) => t.id === updatedTask.id ? updatedTask : t)
                }))
            };
        });
        // Also update selected task if open
        if (selectedTask?.id === updatedTask.id) {
            setSelectedTask(updatedTask);
        }
    };

    const handleTaskClick = useCallback((task: TaskCardType) => {
        setSelectedTask(task);
        setTaskModalOpen(true);
    }, []);

    // ── Drag-and-Drop handler ──
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);



    const handleDragStart = () => {
        setIsDragging(true);
        isDraggingRef.current = true;
        // Fix issues where focus might be stealing drag
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    const handleDragUpdate = () => {
        // console.log('[DND] Drag Update:', update);
    };

    const handleDragEnd = async (result: DropResult) => {
        setIsDragging(false);
        isDraggingRef.current = false;

        const { source, destination, draggableId } = result;

        if (!destination) {
            return;
        }
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const taskId = parseInt(draggableId.replace('task-', ''));

        // 1. Handle Delete
        if (destination.droppableId === 'trash-zone') {
            handleDeleteTask(taskId);
            return;
        }

        const targetColumnId = parseInt(destination.droppableId.replace('column-', ''));
        const sourceColumnId = parseInt(source.droppableId.replace('column-', ''));

        // 2. Optimistic Update
        const previousBoard = board;
        setBoard((prev) => {
            if (!prev) return prev;
            // Deep clone columns
            const newColumns = prev.columns.map(col => ({
                ...col,
                taskCards: [...col.taskCards]
            }));

            const sourceCol = newColumns.find(c => c.id === sourceColumnId);
            const destCol = newColumns.find(c => c.id === targetColumnId);

            if (!sourceCol || !destCol) return prev;

            const [movedTask] = sourceCol.taskCards.splice(source.index, 1);

            const updatedMovedTask = {
                ...movedTask,
                columnId: targetColumnId,
                order: destination.index
            };

            destCol.taskCards.splice(destination.index, 0, updatedMovedTask);

            return { ...prev, columns: newColumns };
        });

        // 3. API Call
        try {
            await moveTask(taskId, targetColumnId, destination.index);
        } catch (error) {
            console.error("Move failed:", error);
            notifications.show({ title: 'Error', message: 'Failed to save move.', color: 'red' });
            // Revert to previous state
            if (previousBoard) setBoard(previousBoard);
        }
    };

    // ── Add Task ──
    // ── Add Task ──
    const handleAddTask = useCallback(async (columnId: number, title: string) => {
        try {
            const newTask = await createTask(title, columnId);
            setBoard((prev) => {
                if (!prev) return prev;
                // Check duplication strictly
                const exists = prev.columns.some(col => col.taskCards.some(t => t.id === newTask.id));
                if (exists) return prev;

                return {
                    ...prev,
                    columns: prev.columns.map((col) =>
                        col.id === columnId
                            ? { ...col, taskCards: [...col.taskCards, newTask] }
                            : col
                    ),
                };
            });
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to create task.', color: 'red' });
        }
    }, []);

    // ── Delete Task ──
    // ── Delete Task ──
    const handleDeleteTask = useCallback(async (taskId: number) => {
        try {
            // Optimistic update first
            setBoard((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    columns: prev.columns.map((col) => ({
                        ...col,
                        taskCards: col.taskCards.filter((t) => t.id !== taskId),
                    })),
                };
            });
            // We use functional update or ref to access current state if needed, but for selectedTask we need a ref or dependency
            // However, breaking encapsulation of selectedTask might be okay if we just close it.
            // BETTER: Use a ref for selectedTask or just omit it from dependency if we accept stale closure (but we set state).
            // Actually, setTaskModalOpen is stable. selectedTask is state.
            // If we use functional update for setTaskModalOpen? No, it's boolean.
            // Let's just include selectedTask in dependency or check inside.
            // But wait, if we include selectedTask, handleAddTask changes when selectedTask changes, re-rendering columns.
            // We want handleAddTask to be STABLE.
            // So we should NOT depend on selectedTask.
            // We can read selectedTask from a ref? Or just ignore closing the modal here?
            // The modal will close if the task is deleted? No.
            // Let's just leave the modal open logic out of this callback for now to keep it stable, OR use a Ref.
            // Actually, we can use a functional check inside setTaskModalOpen? No.
            // Let's use a ref for selectedTask ID.

            await deleteTask(taskId);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to delete task.', color: 'red' });
            fetchBoard(); // Revert on failure
        }
    }, [fetchBoard]);

    // ── Invite Member ──
    const handleInvite = async () => {
        if (!inviteUsername.trim() || !boardId) return;
        setInviting(true);
        try {
            await inviteMember(boardId, inviteUsername.trim());
            setInviteUsername('');
            notifications.show({ title: 'Invited!', message: `${inviteUsername} has been added to the board.`, color: 'green' });
            fetchBoard();
        } catch {
            notifications.show({ title: 'Error', message: 'Could not invite user. Check the username or permissions.', color: 'red' });
        } finally {
            setInviting(false);
        }
    };

    // ── Remove Member ──
    const handleRemoveMember = async (userId: number) => {
        if (!boardId) return;
        try {
            await removeMember(boardId, userId);
            notifications.show({ title: 'Removed', message: 'Member removed from the board.', color: 'orange' });
            fetchBoard();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to remove member.', color: 'red' });
        }
    };

    const fetchAllBoards = async () => {
        setFetchingBoards(true);
        try {
            const data = await getBoards();
            setAllBoards(data);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to load boards.', color: 'red' });
        } finally {
            setFetchingBoards(false);
        }
    };

    const handleOpenSwitchModal = () => {
        setSwitchModalOpen(true);
        fetchAllBoards();
    };

    const handleUpdateTheme = async (color: ThemeColor) => {
        if (!boardId) return;
        // Optimistic update
        setBoard(prev => prev ? { ...prev, themeColor: color } : null);

        try {
            await updateBoard(boardId, { themeColor: color });
            notifications.show({ title: 'Theme Updated', message: 'Board theme has been changed.', color: 'green' });
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to update theme.', color: 'red' });
            fetchBoard(); // Revert
        }
    };

    const handleTitleUpdate = async () => {
        if (!boardId || !editedTitle.trim() || editedTitle === board?.name) {
            setIsEditingTitle(false);
            return;
        }

        const oldBoard = board;
        // Optimistic update
        setBoard(prev => prev ? { ...prev, name: editedTitle.trim() } : null);
        setIsEditingTitle(false);

        try {
            await updateBoard(boardId, { name: editedTitle.trim() });
            notifications.show({ title: 'Board Renamed', message: 'The board has been successfully renamed.', color: 'green' });
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to rename board.', color: 'red' });
            setBoard(oldBoard);
        }
    };

    if (loading) {
        return (
            <Center style={{ minHeight: '100vh', background: '#000' }}>
                <Loader color="violet" size="lg" />
            </Center>
        );
    }

    if (!board) {
        return (
            <Center style={{ minHeight: '100vh', background: '#000' }}>
                <Text c="dimmed">Board not found.</Text>
            </Center>
        );
    }

    const members = board.members || [];
    const activeTheme = (board as any).themeColor ? BOARD_THEMES[(board as any).themeColor as ThemeColor] : BOARD_THEMES.blue;

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: activeTheme.gradient,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header Area */}
            <Box px="lg" py="md" style={{ background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Group justify="space-between">
                    <Group gap="xl">
                        <Box>
                            {isEditingTitle ? (
                                <TextInput
                                    autoFocus
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.currentTarget.value)}
                                    onBlur={handleTitleUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTitleUpdate()}
                                    size="xs"
                                    styles={{
                                        input: {
                                            fontWeight: 800,
                                            fontSize: 'var(--mantine-font-size-xl)',
                                            background: 'rgba(255,255,255,0.1)',
                                            color: 'white',
                                            border: 'none',
                                            paddingLeft: 0,
                                            height: 'auto',
                                            minHeight: 0
                                        }
                                    }}
                                />
                            ) : (
                                <Text
                                    c="white"
                                    fw={800}
                                    size="xl"
                                    style={{ letterSpacing: '-0.5px', cursor: 'pointer' }}
                                    onDoubleClick={() => {
                                        setEditedTitle(board.name);
                                        setIsEditingTitle(true);
                                    }}
                                    title="Double click to rename"
                                >
                                    {board.name}
                                </Text>
                            )}
                            <Group gap={4}>
                                <Text c="white" size="xs" opacity={0.6} fw={500} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <IconBriefcase size={12} />
                                    {board.workspaceId ? 'Workspace Board' : 'Personal Board'}
                                </Text>
                                <Menu shadow="md" width={200} radius="md" styles={{ dropdown: { background: '#1a1b1e', border: '1px solid rgba(255,255,255,0.1)' } }}>
                                    <Menu.Target>
                                        <Button
                                            variant="subtle"
                                            color="white"
                                            size="compact-xs"
                                            radius="xs"
                                            leftSection={<IconLayoutDashboard size={14} />}
                                            rightSection={<IconChevronDown size={12} />}
                                            style={{ height: 20, fontSize: 10, opacity: 0.8 }}
                                        >
                                            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                                        </Button>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item
                                            leftSection={<IconLayoutDashboard size={16} />}
                                            onClick={() => setViewMode('board')}
                                            style={{ color: viewMode === 'board' ? '#7c3aed' : 'white' }}
                                        >
                                            Quadro
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconTable size={16} />}
                                            onClick={() => setViewMode('table')}
                                            style={{ color: viewMode === 'table' ? '#7c3aed' : 'white' }}
                                        >
                                            Tabela
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconCalendar size={16} />}
                                            onClick={() => setViewMode('calendar')}
                                            style={{ color: viewMode === 'calendar' ? '#7c3aed' : 'white' }}
                                        >
                                            Calendário
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconRotate size={16} />}
                                            onClick={() => setViewMode('dashboard')}
                                            style={{ color: viewMode === 'dashboard' ? '#7c3aed' : 'white' }}
                                        >
                                            Painel
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconList size={16} />}
                                            onClick={() => setViewMode('timeline')}
                                            style={{ color: viewMode === 'timeline' ? '#7c3aed' : 'white' }}
                                        >
                                            Cronograma
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconLocation size={16} />}
                                            onClick={() => setViewMode('map')}
                                            style={{ color: viewMode === 'map' ? '#7c3aed' : 'white' }}
                                        >
                                            Mapa
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        </Box>

                        <Group gap="xs">
                            <Avatar.Group spacing="sm">
                                {members.slice(0, 3).map(m => (
                                    <Avatar key={m.userId} radius="xl" size="sm" title={m.username || 'User'} color="violet">
                                        {(m.username || '?').slice(0, 2).toUpperCase()}
                                    </Avatar>
                                ))}
                                {members.length > 3 && (
                                    <Avatar radius="xl" size="sm">+{members.length - 3}</Avatar>
                                )}
                            </Avatar.Group>
                            <ActionIcon
                                variant="subtle"
                                color="white"
                                size="sm"
                                onClick={() => setMembersModalOpen(true)}
                                style={{ borderRadius: '50%', opacity: 0.7 }}
                            >
                                <IconUsers size={16} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    <Group gap="sm">
                        <Button
                            variant="white"
                            color="dark"
                            size="xs"
                            radius="md"
                            leftSection={<IconUserPlus size={16} />}
                            onClick={() => setMembersModalOpen(true)}
                            style={{ fontWeight: 600 }}
                        >
                            Compartilhar
                        </Button>
                        <ActionIcon variant="subtle" color="white" onClick={() => navigate('/boards')}>
                            <IconLogout size={20} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Box>

            {/* Main Content Area */}
            <Box style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {viewMode === 'board' ? (
                    <DragDropContext
                        onDragStart={handleDragStart}
                        onDragUpdate={handleDragUpdate}
                        onDragEnd={handleDragEnd}
                    >
                        <Group
                            align="flex-start"
                            gap="md"
                            wrap="nowrap"
                            px="lg"
                            py="lg"
                            style={{
                                overflowX: 'auto',
                                height: '100%',
                                alignItems: 'flex-start',
                            }}
                        >
                            {board?.columns.map((col) => (
                                <BoardColumn
                                    key={col.id}
                                    column={col}
                                    onAddTask={handleAddTask}
                                    onDeleteTask={handleDeleteTask}
                                    onTaskClick={handleTaskClick}
                                />
                            ))}
                        </Group>

                        {/* Trash Zone */}
                        <Box
                            style={{
                                position: 'fixed',
                                bottom: 40,
                                left: '50%',
                                transform: `translate(-50%, ${isDragging ? '0' : '200%'})`,
                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                zIndex: 1000,
                            }}
                        >
                            <Droppable droppableId="trash-zone">
                                {(provided, snapshot) => (
                                    <Box
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            background: snapshot.isDraggingOver
                                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                                : 'rgba(20, 21, 23, 0.8)',
                                            backdropFilter: 'blur(12px)',
                                            border: `1px solid ${snapshot.isDraggingOver ? '#fca5a5' : 'rgba(55, 58, 64, 0.5)'}`,
                                            borderRadius: 32,
                                            padding: '16px 32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            boxShadow: snapshot.isDraggingOver
                                                ? '0 0 32px rgba(239, 68, 68, 0.6)'
                                                : '0 8px 32px rgba(0,0,0,0.4)',
                                            color: snapshot.isDraggingOver ? 'white' : '#909296',
                                            transition: 'all 0.2s ease',
                                            scale: snapshot.isDraggingOver ? 1.1 : 1,
                                        }}
                                    >
                                        <IconTrash size={24} />
                                        <Text fw={600}>Drop to delete</Text>
                                        <Box style={{ display: 'none' }}>{provided.placeholder}</Box>
                                    </Box>
                                )}
                            </Droppable>
                        </Box>
                    </DragDropContext>
                ) : viewMode === 'table' ? (
                    <Box p="lg" style={{ height: '100%' }}>
                        {board && <BoardTableView board={board} />}
                    </Box>
                ) : viewMode === 'calendar' ? (
                    <Box p="lg" style={{ height: '100%' }}>
                        {board && <BoardCalendarView board={board} onTaskClick={handleTaskClick} />}
                    </Box>
                ) : viewMode === 'dashboard' ? (
                    <Box style={{ height: '100%' }}>
                        {board && <BoardDashboardView board={board} />}
                    </Box>
                ) : viewMode === 'timeline' ? (
                    <Box p="lg" style={{ height: '100%' }}>
                        {board && <BoardTimelineView board={board} onTaskClick={handleTaskClick} />}
                    </Box>
                ) : (
                    <Center style={{ height: '100%' }}>
                        <Stack align="center" gap="xs">
                            <ThemeIcon size={64} radius="xl" variant="light" color="violet">
                                <IconRotate size={32} />
                            </ThemeIcon>
                            <Text fw={600} c="white" size="lg">{viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View</Text>
                            <Text c="dimmed">This view is currently under development.</Text>
                            <Button variant="subtle" color="violet" onClick={() => setViewMode('board')}>Back to Board</Button>
                        </Stack>
                    </Center>
                )}
            </Box>

            {/* Floating Bottom Bar */}
            <Box
                p="xs"
                style={{
                    position: 'fixed',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(20, 21, 23, 0.85)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    zIndex: 1000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
            >
                <Group gap="lg" px="md">
                    <Button variant="subtle" color="blue" size="xs" leftSection={<IconMail size={16} />}>Caixa de entrada</Button>
                    <Button variant="subtle" color="gray" size="xs" leftSection={<IconCalendar size={16} />}>Planejador</Button>
                    <Button variant="light" color="blue" size="xs" leftSection={<IconLayoutDashboard size={16} />}>Quadro</Button>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        leftSection={<IconExchange size={16} />}
                        onClick={handleOpenSwitchModal}
                    >
                        Mudar de quadros
                    </Button>
                </Group>
            </Box>

            {/* Board Switcher Modal */}
            <Modal
                opened={switchModalOpen}
                onClose={() => setSwitchModalOpen(false)}
                title={
                    <Group gap="xs">
                        <IconExchange size={20} />
                        <Text fw={600}>Mudar de Quadro</Text>
                    </Group>
                }
                centered
                radius="lg"
                size="md"
                styles={{
                    content: { background: '#1a1b1e' },
                    header: { background: '#1a1b1e' },
                }}
            >
                {fetchingBoards ? (
                    <Center py="xl">
                        <Loader size="sm" color="violet" />
                    </Center>
                ) : (
                    <Stack gap="md">
                        {/* Current Workspace Boards */}
                        {board?.workspaceId && (
                            <Box>
                                <Text size="xs" fw={700} c="dimmed" mb="xs" style={{ textTransform: 'uppercase' }}>
                                    Quadros deste Workspace
                                </Text>
                                <Stack gap="xs">
                                    {allBoards
                                        .filter(b => b.workspaceId === board.workspaceId && b.id !== board.id)
                                        .map(b => (
                                            <Paper
                                                key={b.id}
                                                p="sm"
                                                radius="md"
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => {
                                                    setSwitchModalOpen(false);
                                                    navigate(`/boards/${b.id}`);
                                                }}
                                            >
                                                <Group justify="space-between">
                                                    <Group gap="sm">
                                                        <Box
                                                            style={{
                                                                width: 12,
                                                                height: 12,
                                                                borderRadius: 4,
                                                                background: BOARD_THEMES[b.themeColor as ThemeColor]?.background || '#3b82f6'
                                                            }}
                                                        />
                                                        <Text size="sm" fw={500}>{b.name}</Text>
                                                    </Group>
                                                    <Badge size="xs" variant="dot" color="violet">{b.role}</Badge>
                                                </Group>
                                            </Paper>
                                        ))
                                    }
                                    {allBoards.filter(b => b.workspaceId === board.workspaceId && b.id !== board.id).length === 0 && (
                                        <Text size="xs" c="dimmed" ta="center">Não há outros quadros neste workspace.</Text>
                                    )}
                                </Stack>
                            </Box>
                        )}

                        {/* Other Boards */}
                        <Box mt={board?.workspaceId ? 'sm' : 0}>
                            <Text size="xs" fw={700} c="dimmed" mb="xs" style={{ textTransform: 'uppercase' }}>
                                Outros Quadros
                            </Text>
                            <Stack gap="xs" style={{ maxHeight: 300, overflowY: 'auto' }}>
                                {allBoards
                                    .filter(b => b.workspaceId !== board?.workspaceId || (board?.workspaceId === null && b.workspaceId === null && b.id !== board.id))
                                    .map(b => (
                                        <Paper
                                            key={b.id}
                                            p="sm"
                                            radius="md"
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                setSwitchModalOpen(false);
                                                navigate(`/boards/${b.id}`);
                                            }}
                                        >
                                            <Group justify="space-between">
                                                <Group gap="sm">
                                                    <Box
                                                        style={{
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: 4,
                                                            background: BOARD_THEMES[b.themeColor as ThemeColor]?.background || '#3b82f6'
                                                        }}
                                                    />
                                                    <Text size="sm" fw={500}>{b.name}</Text>
                                                </Group>
                                                <Badge size="xs" variant="dot" color="teal">{b.role}</Badge>
                                            </Group>
                                        </Paper>
                                    ))
                                }
                                {allBoards.length === 0 && (
                                    <Text size="xs" c="dimmed" ta="center">Você ainda não tem outros quadros.</Text>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                )}
            </Modal>

            {/* Members Modal */}
            <Modal
                opened={membersModalOpen}
                onClose={() => setMembersModalOpen(false)}
                title={
                    <Box>
                        <Text fw={700} size="lg">Invite to "{board.name}"</Text>
                        <Text size="xs" c="dimmed">Invited members will only have access to this specific board.</Text>
                    </Box>
                }
                size="md"
                centered
                styles={{ header: { background: '#1a1b1e', borderBottom: '1px solid rgba(255,255,255,0.1)' }, content: { background: '#1a1b1e' } }}
            >
                <Stack gap="md">
                    {/* Invite form (owner only) */}
                    {isOwner && (
                        <Paper p="md" radius="md" style={{ background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                            <Text size="sm" fw={500} mb="xs" c="dimmed">Invite a collaborator</Text>
                            <Group gap="xs">
                                <TextInput
                                    placeholder="Enter username..."
                                    value={inviteUsername}
                                    onChange={(e) => setInviteUsername(e.currentTarget.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                    style={{ flex: 1 }}
                                    styles={{ input: { background: 'rgba(0,0,0,0.4)' } }}
                                />
                                <Button
                                    leftSection={<IconUserPlus size={16} />}
                                    variant="gradient"
                                    gradient={{ from: 'violet', to: 'indigo' }}
                                    loading={inviting}
                                    onClick={handleInvite}
                                >
                                    Invite
                                </Button>
                            </Group>
                        </Paper>
                    )}

                    {/* Members List */}
                    <Stack gap="xs">
                        {members.map((m) => (
                            <Paper
                                key={m.userId}
                                p="sm"
                                radius="md"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(55, 58, 64, 0.3)',
                                }}
                            >
                                <Group justify="space-between">
                                    <Group gap="sm">
                                        <Avatar
                                            size="md"
                                            radius="xl"
                                            color={m.role === 'Owner' ? 'violet' : 'teal'}
                                        >
                                            {(m.username || '?').slice(0, 2).toUpperCase()}
                                        </Avatar>
                                        <div>
                                            <Text size="sm" fw={500} c="white">{m.username}</Text>
                                            <Text size="xs" c="dimmed">{m.email}</Text>
                                        </div>
                                    </Group>
                                    <Group gap="xs">
                                        <Badge
                                            variant="light"
                                            color={m.role === 'Owner' ? 'violet' : 'teal'}
                                            size="sm"
                                        >
                                            {m.role}
                                        </Badge>
                                        {isOwner && m.role !== 'Owner' && (
                                            <ActionIcon
                                                variant="subtle"
                                                color="red"
                                                size="sm"
                                                onClick={() => handleRemoveMember(m.userId)}
                                                title="Remove member"
                                            >
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                </Group>
                            </Paper>
                        ))}
                        {members.length === 0 && (
                            <Text c="dimmed" ta="center" size="sm" py="lg">No members yet. Invite collaborators to get started!</Text>
                        )}
                    </Stack>

                    {/* Theme Selector (Owner Only) */}
                    {isOwner && (
                        <Box mt="xl">
                            <Text fw={600} mb="sm">Board Theme</Text>
                            <Group gap="xs">
                                {Object.entries(BOARD_THEMES).map(([key, value]) => (
                                    <ThemeIcon
                                        key={key}
                                        size="lg"
                                        radius="xl"
                                        style={{
                                            cursor: 'pointer',
                                            backgroundColor: value.background,
                                            border: (board as any).themeColor === key ? '2px solid white' : 'none',
                                            boxShadow: (board as any).themeColor === key ? '0 0 0 2px #000' : 'none'
                                        }}
                                        onClick={() => handleUpdateTheme(key as ThemeColor)}
                                    >
                                        {(board as any).themeColor === key && <IconCheck size={14} />}
                                    </ThemeIcon>
                                ))}
                            </Group>
                        </Box>
                    )}

                </Stack>
            </Modal>

            {/* Task Detail Modal */}
            <TaskDetailModal
                opened={taskModalOpen}
                onClose={() => setTaskModalOpen(false)}
                task={selectedTask}
                members={members}
                onTaskUpdated={handleTaskUpdated}
            />
        </Box>
    );
}
