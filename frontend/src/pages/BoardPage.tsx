import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
    Autocomplete,
    useComputedColorScheme
} from '@mantine/core';
import {
    IconUserPlus,
    IconTrash,
    IconBriefcase,
    IconLogout,
    IconCalendar,
    IconLayoutDashboard,
    IconExchange,
    IconTable,
    IconChevronDown,
    IconRotate,
    IconList,
    IconPlus,
    IconX,
    IconChartBar,
    IconSettings,
    IconLock
} from '@tabler/icons-react';
import {
    DragDropContext,
    type DropResult,
    Droppable,
    Draggable,
} from '@hello-pangea/dnd';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';
import {
    getBoardDetail,
    getBoards,
    inviteMember,
    removeMember,
    updateBoard,
    createColumn,
    moveColumn,
    deleteColumn,
    updateColumn,
    closeBoard,
    deleteBoard,
    reopenBoard,
    type BoardDetail,
    type BoardSummary,
    type TaskCard as TaskCardType,
    type BoardMember,
} from '../api/boards';
import { searchUsers, type UserSummary } from '../api/users';
import { createTask, moveTask, deleteTask } from '../api/tasks';

import { type Label } from '../api/labels';
import { useSignalR } from '../hooks/useSignalR';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import BoardColumn from '../components/BoardColumn';



import TaskDetailModal from '../components/TaskDetailModal';
import BoardTableView from '../components/BoardTableView';
import BoardCalendarView from '../components/BoardCalendarView';
import BoardDashboardView from '../components/BoardDashboardView';
import BoardTimelineView from '../components/BoardTimelineView';
import BoardAnalyticsModal from '../components/BoardAnalyticsModal';
import { BOARD_THEMES, type ThemeColor } from '../constants/themes';

type ViewMode = 'board' | 'table' | 'calendar' | 'dashboard' | 'timeline' | 'map';

export default function BoardPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const computedColorScheme = useComputedColorScheme('dark');

    const boardId = id ? parseInt(id) : null;

    const [board, setBoard] = useState<BoardDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    // Task Detail Modal State
    const [selectedTask, setSelectedTask] = useState<TaskCardType | null>(null);
    const [taskModalOpen, setTaskModalOpen] = useState(false);

    // Board Switcher State
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [allBoards, setAllBoards] = useState<BoardSummary[]>([]);
    const [fetchingBoards, setFetchingBoards] = useState(false);

    // Invite Search State
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchValue, 300);
    const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Layout State
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [isAddingList, setIsAddingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');

    const addTaskInputRef = useRef<HTMLInputElement>(null);
    const visibleTaskIds = null;

    // Keyboard shortcuts
    const shortcuts = useMemo(() => ({
        'n': () => {
            // Programmatically click the first column's "Add Task" button
            addTaskInputRef.current?.closest('[data-add-trigger]')?.dispatchEvent(
                new MouseEvent('click', { bubbles: true })
            );
        },
    }), []);

    useKeyboardShortcuts(shortcuts);


    const isOwner = board?.userRole === 'Owner' || board?.userRole === 'Admin';

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

    // ── Delete Column ──
    const handleDeleteColumn = useCallback(async (columnId: number) => {
        if (!boardId || board?.isClosed) return;
        const previousColumns = board?.columns;

        // Optimistic
        setBoard((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                columns: prev.columns.filter(c => c.id !== columnId)
            };
        });

        try {
            await deleteColumn(boardId, columnId);
            notifications.show({ title: 'Success', message: 'List deleted', color: 'blue' });
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to delete list', color: 'red' });
            // Revert
            setBoard((prev) => prev && previousColumns ? { ...prev, columns: previousColumns } : prev);
        }
    }, [boardId, board]);

    // ── Update Column (Rename) ──
    const handleUpdateColumn = useCallback(async (columnId: number, name: string) => {
        if (!boardId || board?.isClosed) return;
        const previousColumns = board?.columns;

        // Optimistic
        setBoard((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                columns: prev.columns.map(c => c.id === columnId ? { ...c, name } : c)
            };
        });

        try {
            await updateColumn(boardId, columnId, name);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to rename list', color: 'red' });
            // Revert
            setBoard((prev) => prev && previousColumns ? { ...prev, columns: previousColumns } : prev);
        }
    }, [boardId, board]);


    const handleTaskMoveInternal = (task: TaskCardType) => {
        setBoard((prev) => {
            if (!prev) return prev;

            // Find current location of the task
            let sourceColIndex = -1;
            let sourceTaskIndex = -1;

            prev.columns.forEach((col, cIdx) => {
                const tIdx = col.taskCards.findIndex(t => t.id === task.id);
                if (tIdx !== -1) {
                    sourceColIndex = cIdx;
                    sourceTaskIndex = tIdx;
                }
            });

            // If not found, check if it's a new task to be inserted (e.g. from another user)
            // But usually move implies existing. If checks fail, return prev.
            if (sourceColIndex === -1 && !task.columnId) return prev;

            const targetColIndex = prev.columns.findIndex(c => c.id === task.columnId);
            if (targetColIndex === -1) return prev;

            // Clone to ensure we have a new object reference in state
            const updatedTask = { ...task };

            const newColumns = [...prev.columns];

            // If dragging within same column
            if (sourceColIndex === targetColIndex) {
                const newCards = [...newColumns[sourceColIndex].taskCards];
                if (sourceColIndex !== -1) newCards.splice(sourceTaskIndex, 1);

                const insertIndex = Math.min(task.order, newCards.length);
                newCards.splice(insertIndex, 0, updatedTask);

                newColumns[sourceColIndex] = { ...newColumns[sourceColIndex], taskCards: newCards };
            }
            // If dragging between different columns
            else {
                if (sourceColIndex !== -1) {
                    const sourceCards = [...newColumns[sourceColIndex].taskCards];
                    sourceCards.splice(sourceTaskIndex, 1);
                    newColumns[sourceColIndex] = { ...newColumns[sourceColIndex], taskCards: sourceCards };
                }

                const targetCards = [...newColumns[targetColIndex].taskCards];
                const insertIndex = Math.min(task.order, targetCards.length);
                targetCards.splice(insertIndex, 0, updatedTask);
                newColumns[targetColIndex] = { ...newColumns[targetColIndex], taskCards: targetCards };
            }

            return {
                ...prev,
                columns: newColumns
            };
        });
    };

    useEffect(() => {
        fetchBoard();
    }, [fetchBoard]);

    useEffect(() => {
        if (debouncedSearch) {
            handleSearch(debouncedSearch);
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearch]);

    const handleSearch = async (query: string) => {
        setSearchLoading(true);
        try {
            const results = await searchUsers(query);
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setSearchLoading(false);
        }
    };

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
        onTaskUpdated: (task: TaskCardType) => {
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
        onLabelCreated: (label: Label) => {
            setBoard((prev) => {
                if (!prev) return prev;
                const exists = prev.labels.some(l => l.id === label.id);
                if (exists) return prev;
                return {
                    ...prev,
                    labels: [...prev.labels, label]
                };
            });
        },
        onLabelUpdated: (label: Label) => {
            setBoard((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    labels: prev.labels.map(l => l.id === label.id ? label : l)
                };
            });
        },
        onLabelDeleted: (labelId: number) => {
            setBoard((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    labels: prev.labels.filter(l => l.id !== labelId)
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

    const handleAddList = async () => {
        if (!newListTitle.trim() || !boardId || board?.isClosed) return;
        try {
            const newCol = await createColumn(boardId, newListTitle.trim());
            setBoard(prev => prev ? { ...prev, columns: [...prev.columns, newCol] } : prev);
            setNewListTitle('');
            setIsAddingList(false);
            notifications.show({ title: 'Success', message: 'List added', color: 'green' });
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to create list', color: 'red' });
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
        if (board?.isClosed) return;
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
        if (board?.isClosed) return;
        setIsDragging(false);
        isDraggingRef.current = false;

        const { source, destination, draggableId } = result;

        if (!destination) {
            return;
        }
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        if (result.type === 'COLUMN') {
            const { source, destination } = result;
            if (!destination || source.index === destination.index) return;

            const newColumns = Array.from(board?.columns || []);
            const [movedCol] = newColumns.splice(source.index, 1);
            newColumns.splice(destination.index, 0, movedCol);

            // Optimistic
            setBoard(prev => prev ? { ...prev, columns: newColumns } : prev);

            try {
                const colId = parseInt(result.draggableId.replace('column-', ''));
                await moveColumn(board!.id, colId, destination.index);
            } catch {
                notifications.show({ title: 'Error', message: 'Failed to reorder columns', color: 'red' });
                fetchBoard();
            }
            return;
        }

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

            const newColumns = [...prev.columns];
            const sourceColIndex = newColumns.findIndex(c => c.id === sourceColumnId);
            const targetColIndex = newColumns.findIndex(c => c.id === targetColumnId);

            if (sourceColIndex === -1 || targetColIndex === -1) return prev;

            const sourceCol = newColumns[sourceColIndex];
            const destCol = newColumns[targetColIndex];

            // Same column drag
            if (sourceColumnId === targetColumnId) {
                const newCards = [...sourceCol.taskCards];
                const [movedTask] = newCards.splice(source.index, 1);
                newCards.splice(destination.index, 0, movedTask);
                newColumns[sourceColIndex] = { ...sourceCol, taskCards: newCards };
            }
            // Cross column drag
            else {
                const sourceCards = [...sourceCol.taskCards];
                const destCards = [...destCol.taskCards];

                const [movedTask] = sourceCards.splice(source.index, 1);

                const updatedMovedTask = {
                    ...movedTask,
                    columnId: targetColumnId,
                    order: destination.index
                };

                destCards.splice(destination.index, 0, updatedMovedTask);

                newColumns[sourceColIndex] = { ...sourceCol, taskCards: sourceCards };
                newColumns[targetColIndex] = { ...destCol, taskCards: destCards };
            }

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
    const handleAddTask = useCallback(async (columnId: number, title: string, description?: string, priority?: string) => {
        if (board?.isClosed) return;
        try {
            console.log(`[BoardPage] handleAddTask called for Column: ${columnId}`, { title, descLength: description?.length });
            const newTask = await createTask(title, columnId, description, priority);
            console.log(`[BoardPage] Received from Backend:`, { id: newTask.id, title: newTask.title, descHash: newTask.description?.substring(0, 20) + "..." });
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
    const handleDeleteTask = useCallback(async (taskId: number) => {
        if (board?.isClosed) return;
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
        if (!searchValue.trim() || !boardId || board?.isClosed) return;
        setInviting(true);
        try {
            await inviteMember(boardId, searchValue.trim());
            setSearchValue('');
            setSearchResults([]);
            notifications.show({ title: 'Invited!', message: `${searchValue} has been added to the board.`, color: 'green' });
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

    const handleCloseBoard = async () => {
        if (!boardId) return;
        try {
            await closeBoard(boardId);
            notifications.show({ title: 'Success', message: 'Board closed successfully.', color: 'green' });
            setCloseModalOpen(false);
            fetchBoard(); // Refresh to show banner and read-only mode
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to close board.', color: 'red' });
        }
    };

    const handleReopenBoard = async () => {
        if (!boardId) return;
        try {
            await reopenBoard(boardId);
            notifications.show({ title: 'Success', message: 'Board reopened successfully.', color: 'green' });
            fetchBoard();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to reopen board.', color: 'red' });
        }
    };

    const handleDeleteBoard = async () => {
        if (!boardId) return;
        try {
            await deleteBoard(boardId);
            notifications.show({ title: 'Success', message: 'Board deleted permanently.', color: 'green' });
            setDeleteModalOpen(false);
            navigate('/boards');
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to delete board.', color: 'red' });
        }
    };

    if (loading) {
        return (
            <Center style={{ minHeight: '100%', background: computedColorScheme === 'dark' ? '#0a0a0b' : '#f8f9fa' }}>
                <Loader color="violet" size="lg" />
            </Center>
        );
    }

    if (!board) {
        return (
            <Center style={{ minHeight: '100%', background: computedColorScheme === 'dark' ? '#0a0a0b' : '#f8f9fa' }}>
                <Text c={computedColorScheme === 'dark' ? 'dimmed' : 'gray.6'}>Board not found.</Text>
            </Center>
        );
    }

    const members = board.members || [];
    const themeColor = (board as any).themeColor as ThemeColor;
    const activeTheme = BOARD_THEMES[themeColor] || BOARD_THEMES.blue;

    return (
        <Box
            style={{
                flex: 1,
                minHeight: '100%',
                background: activeTheme.gradient,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Closed Board Banner */}
            {board.isClosed && (
                <Box py="xs" style={{ background: 'var(--mantine-color-orange-9)', textAlign: 'center' }}>
                    <Group justify="center" gap="xs">
                        <IconLock size={16} color="white" />
                        <Text fw={700} size="sm" c="white">This board is closed. You are in read-only mode.</Text>
                        <Button
                            variant="white"
                            color="orange"
                            size="compact-xs"
                            radius="xl"
                            onClick={handleReopenBoard}
                            leftSection={<IconRotate size={14} />}
                        >
                            Reopen Board
                        </Button>
                    </Group>
                </Box>
            )}

            {/* Header Area */}
            <Box px="xl" py="lg" style={{ background: computedColorScheme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                <Group justify="space-between">
                    <Group gap="xl" align="center">
                        <Box>
                            <Group gap="sm" mb={4}>
                                <Text c="white" size="sm" opacity={0.5} fw={600} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <IconBriefcase size={14} />
                                    Workspace
                                </Text>
                                <Text c="white" size="sm" opacity={0.3}>/</Text>
                                <Menu shadow="md" width={220} radius="md" styles={{ dropdown: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` } }}>
                                    <Menu.Target>
                                        <Button
                                            variant="subtle"
                                            color="white"
                                            size="compact-sm"
                                            radius="sm"
                                            leftSection={<IconLayoutDashboard size={18} />}
                                            rightSection={<IconChevronDown size={14} />}
                                            style={{ height: 28, fontSize: 13, opacity: 0.8 }}
                                        >
                                            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                                        </Button>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item leftSection={<IconLayoutDashboard size={18} />} onClick={() => setViewMode('board')}>Quadro</Menu.Item>
                                        <Menu.Item leftSection={<IconTable size={18} />} onClick={() => setViewMode('table')}>Tabela</Menu.Item>
                                        <Menu.Item leftSection={<IconCalendar size={18} />} onClick={() => setViewMode('calendar')}>Calendário</Menu.Item>
                                        <Menu.Item leftSection={<IconRotate size={18} />} onClick={() => setViewMode('dashboard')}>Painel</Menu.Item>
                                        <Menu.Item leftSection={<IconList size={18} />} onClick={() => setViewMode('timeline')}>Cronograma</Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                            {isEditingTitle ? (
                                <TextInput
                                    autoFocus
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.currentTarget.value)}
                                    onBlur={handleTitleUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTitleUpdate()}
                                    size="md"
                                    styles={{
                                        input: {
                                            fontWeight: 800,
                                            fontSize: 'var(--mantine-font-size-2xl)',
                                            background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                            color: 'white',
                                            border: 'none',
                                            paddingLeft: 8,
                                            height: 'auto',
                                        }
                                    }}
                                />
                            ) : (
                                <Text
                                    c="white"
                                    fw={800}
                                    size="2rem"
                                    style={{
                                        letterSpacing: '-1px',
                                        cursor: board.isClosed ? 'default' : 'pointer',
                                        lineHeight: 1.1,
                                        textShadow: computedColorScheme === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                    onDoubleClick={() => {
                                        if (board.isClosed) return;
                                        setEditedTitle(board.name);
                                        setIsEditingTitle(true);
                                    }}
                                    title={board.isClosed ? undefined : "Double click to rename"}
                                >
                                    {board.name}
                                </Text>
                            )}
                        </Box>

                        <Group gap="md">
                            <Avatar.Group spacing="md">
                                {members.slice(0, 4).map(m => (
                                    <Avatar key={m.userId} src={m.avatarUrl} radius="xl" size="md" title={m.username || 'User'} color="indigo">
                                        {(m.username || '?').slice(0, 2).toUpperCase()}
                                    </Avatar>
                                ))}
                                {members.length > 4 && (
                                    <Avatar radius="xl" size="md">+{members.length - 4}</Avatar>
                                )}
                            </Avatar.Group>
                        </Group>
                    </Group>

                    <Group gap="md">
                        <Button
                            variant={computedColorScheme === 'dark' ? 'default' : 'white'}
                            color={computedColorScheme === 'dark' ? 'gray' : 'dark'}
                            size="md"
                            radius="md"
                            leftSection={<IconChartBar size={20} />}
                            onClick={() => setAnalyticsModalOpen(true)}
                            fw={700}
                        >
                            Analytics
                        </Button>
                        <Button
                            variant={computedColorScheme === 'dark' ? 'default' : 'white'}
                            color={computedColorScheme === 'dark' ? 'gray' : 'dark'}
                            size="md"
                            radius="md"
                            leftSection={<IconUserPlus size={20} />}
                            onClick={() => setMembersModalOpen(true)}
                            fw={700}
                        >
                            Compartilhar
                        </Button>
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <ActionIcon variant="subtle" c={computedColorScheme === 'dark' ? 'white' : 'dark'} size="xl" title="Board Settings">
                                    <IconSettings size={22} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {!board.isClosed ? (
                                    <Menu.Item leftSection={<IconLock size={14} />} onClick={() => setCloseModalOpen(true)}>
                                        Close Board
                                    </Menu.Item>
                                ) : (
                                    <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => setDeleteModalOpen(true)}>
                                        Delete Board
                                    </Menu.Item>
                                )}
                            </Menu.Dropdown>
                        </Menu>
                        <ActionIcon variant="subtle" c={computedColorScheme === 'dark' ? 'white' : 'dark'} size="xl" onClick={() => navigate('/boards')} title="Exit Board">
                            <IconLogout size={24} />
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
                        <Droppable droppableId="board-columns" type="COLUMN" direction="horizontal">
                            {(provided) => (
                                <Group
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
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
                                    {board?.columns.map((col, idx) => (
                                        <Draggable key={col.id} draggableId={`column-${col.id}`} index={idx}>
                                            {(provided) => (
                                                <BoardColumn
                                                    column={col}
                                                    onAddTask={handleAddTask}
                                                    onDeleteTask={handleDeleteTask}
                                                    onTaskClick={handleTaskClick}
                                                    onDeleteColumn={handleDeleteColumn}
                                                    onUpdateColumn={handleUpdateColumn}
                                                    visibleTaskIds={visibleTaskIds}
                                                    addTaskInputRef={idx === 0 ? addTaskInputRef : undefined}
                                                    innerRef={provided.innerRef}
                                                    draggableProps={provided.draggableProps}
                                                    dragHandleProps={provided.dragHandleProps}
                                                    isClosed={board.isClosed}
                                                    showAI={idx === 0}
                                                />
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}

                                    {/* Add List Button */}
                                    {!board.isClosed && (
                                        <Box style={{ minWidth: 320, maxWidth: 360 }}>
                                            {isAddingList ? (
                                                <Paper p="sm" style={{
                                                    background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                                                    backdropFilter: 'blur(12px)',
                                                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
                                                    borderRadius: 12,
                                                    boxShadow: computedColorScheme === 'light' ? '0 8px 24px rgba(0,0,0,0.08)' : 'none'
                                                }}>
                                                    <TextInput
                                                        placeholder="Enter list title..."
                                                        value={newListTitle}
                                                        onChange={(e) => setNewListTitle(e.currentTarget.value)}
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddList();
                                                            if (e.key === 'Escape') setIsAddingList(false);
                                                        }}
                                                        mb="sm"
                                                        styles={{
                                                            input: {
                                                                background: computedColorScheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'white',
                                                                color: computedColorScheme === 'dark' ? 'white' : 'black',
                                                                border: computedColorScheme === 'light' ? '1px solid #dee2e6' : 'none'
                                                            }
                                                        }}
                                                    />
                                                    <Group gap="xs">
                                                        <Button size="xs" color="violet" onClick={handleAddList}>Add List</Button>
                                                        <ActionIcon variant="subtle" color="gray" onClick={() => setIsAddingList(false)}>
                                                            <IconX size={18} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Paper>
                                            ) : (
                                                <Button
                                                    fullWidth
                                                    variant="subtle"
                                                    color="gray"
                                                    leftSection={<IconPlus size={18} />}
                                                    style={{
                                                        height: 56,
                                                        background: computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.3)',
                                                        backdropFilter: 'blur(4px)',
                                                        justifyContent: 'flex-start',
                                                        color: 'white',
                                                        border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
                                                        textShadow: computedColorScheme === 'light' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                                    }}
                                                    onClick={() => setIsAddingList(true)}
                                                >
                                                    Add another list
                                                </Button>
                                            )}
                                        </Box>
                                    )}
                                </Group>
                            )}
                        </Droppable>

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
                                                : (computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.8)' : 'rgba(255, 255, 255, 0.9)'),
                                            backdropFilter: 'blur(12px)',
                                            border: `1px solid ${snapshot.isDraggingOver ? '#fca5a5' : 'rgba(55, 58, 64, 0.5)'}`,
                                            borderRadius: 32,
                                            padding: '16px 32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            boxShadow: snapshot.isDraggingOver
                                                ? '0 0 32px rgba(239, 68, 68, 0.6)'
                                                : (computedColorScheme === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)'),
                                            color: snapshot.isDraggingOver ? 'white' : (computedColorScheme === 'dark' ? '#909296' : '#495057'),
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
                            <Text fw={600} c={computedColorScheme === 'dark' ? 'white' : 'black'} size="lg">{viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View</Text>
                            <Text c="dimmed">This view is currently under development.</Text>
                            <Button variant="subtle" color="violet" onClick={() => setViewMode('board')}>Back to Board</Button>
                        </Stack>
                    </Center>
                )
                }
            </Box >

            {/* Floating Bottom Bar */}
            < Box
                p="xs"
                style={{
                    position: 'fixed',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                    borderRadius: 16,
                    zIndex: 1000,
                    boxShadow: computedColorScheme === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.08)',
                }}
            >
                <Group gap="lg" px="md" py={4}>
                    <Button variant="light" color="blue" size="sm" leftSection={<IconLayoutDashboard size={18} />}>Quadro</Button>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="sm"
                        leftSection={<IconExchange size={18} />}
                        onClick={handleOpenSwitchModal}
                    >
                        Mudar de quadros
                    </Button>
                </Group>
            </Box >

            {/* Board Switcher Modal */}
            < Modal
                opened={switchModalOpen}
                onClose={() => setSwitchModalOpen(false)}
                title={
                    < Group gap="xs" >
                        <IconExchange size={20} />
                        <Text fw={600}>Mudar de Quadro</Text>
                    </Group >
                }
                centered
                radius="lg"
                size="md"
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                    header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                }}
            >
                {
                    fetchingBoards ? (
                        <Center py="xl" >
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
                                                        background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                        border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
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
                                                            <Text size="sm" fw={500} c={computedColorScheme === 'dark' ? 'white' : 'black'}>{b.name}</Text>
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
                                                    background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
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
            </Modal >

            {/* Members Modal */}
            < Modal
                opened={membersModalOpen}
                onClose={() => setMembersModalOpen(false)}
                title={
                    < Box >
                        <Text fw={700} size="lg">Invite to "{board.name}"</Text>
                        <Text size="xs" c="dimmed">Invited members will only have access to this specific board.</Text>
                    </Box >
                }
                size="md"
                centered
                styles={{
                    header: {
                        background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white',
                        color: computedColorScheme === 'dark' ? 'white' : 'black',
                        borderBottom: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                    },
                    content: {
                        background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white',
                        color: computedColorScheme === 'dark' ? 'white' : 'black'
                    }
                }}
            >
                <Stack gap="md">
                    {/* Invite form (owner only) */}
                    {isOwner && (
                        <Box mb="md">
                            <Text size="sm" fw={500} mb="xs" c="dimmed">Invite a collaborator</Text>
                            <Group gap="xs" align="flex-start">
                                <Autocomplete
                                    placeholder="Search by username..."
                                    value={searchValue}
                                    onChange={setSearchValue}
                                    data={searchResults.map(u => u.username)}
                                    onOptionSubmit={(val) => {
                                        setSearchValue(val);
                                        // Optional: Auto-invite on selection? Better to let user click Invite to confirm.
                                    }}
                                    rightSection={searchLoading ? <Loader size="xs" /> : null}
                                    style={{ flex: 1 }}
                                    styles={{
                                        input: {
                                            background: computedColorScheme === 'dark' ? 'rgba(0,0,0,0.4)' : 'white',
                                            color: computedColorScheme === 'dark' ? 'white' : 'black'
                                        }
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
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
                        </Box>
                    )}

                    {/* Members List */}
                    <Stack gap="xs">
                        {members.map((m) => (
                            <Paper
                                key={m.userId}
                                p="sm"
                                radius="md"
                                style={{
                                    background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(55, 58, 64, 0.3)' : 'rgba(0, 0, 0, 0.05)'}`,
                                }}
                            >
                                <Group justify="space-between">
                                    <Group gap="sm">
                                        <Avatar
                                            src={m.avatarUrl}
                                            size="md"
                                            radius="xl"
                                            color={m.role === 'Owner' ? 'violet' : 'teal'}
                                        >
                                            {(m.username || '?').slice(0, 2).toUpperCase()}
                                        </Avatar>
                                        <div>
                                            <Text size="sm" fw={500} c={computedColorScheme === 'dark' ? 'white' : 'black'}>{m.username}</Text>
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
                                        {isOwner && m.role !== 'Owner' && !m.isWorkspaceMember && (
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



                </Stack>
            </Modal >

            {/* Task Detail Modal */}
            < TaskDetailModal
                key={selectedTask?.id ?? 'none'}
                opened={taskModalOpen}
                onClose={() => setTaskModalOpen(false)}
                task={selectedTask}
                members={members}
                boardLabels={board.labels || []}
                boardRole={board.userRole}
                onTaskUpdated={handleTaskUpdated}
            />

            {boardId && (
                <BoardAnalyticsModal
                    opened={analyticsModalOpen}
                    onClose={() => setAnalyticsModalOpen(false)}
                    boardId={boardId}
                />
            )}

            <Modal
                opened={closeModalOpen}
                onClose={() => setCloseModalOpen(false)}
                title="Close Board"
                centered
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                    header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                }}
            >
                <Stack>
                    <Text size="sm">
                        Are you sure you want to close this board? You can still access it from the workspace later.
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="subtle" color="gray" onClick={() => setCloseModalOpen(false)}>Cancel</Button>
                        <Button color="red" onClick={handleCloseBoard}>Close Board</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Delete Board"
                centered
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                    header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                }}
            >
                <Stack>
                    <Text size="sm">
                        Are you sure you want to permanently delete this board? <b>This action cannot be undone.</b>
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="subtle" color="gray" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                        <Button color="red" onClick={handleDeleteBoard}>Delete Permanently</Button>
                    </Group>
                </Stack>
            </Modal>
        </Box >
    );
}
