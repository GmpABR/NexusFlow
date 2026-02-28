import { useEffect, useState } from 'react';
import {
    Title,
    Text,
    Button,
    Card,
    SimpleGrid,
    Modal,
    TextInput,
    Group,
    Box,
    ActionIcon,
    Select,
    ThemeIcon,
    Paper,
    Flex,
    Stack,
    NavLink,
    Divider,
    useComputedColorScheme,
    Menu
} from '@mantine/core';
import {
    IconPlus,
    IconCheck,
    IconLayoutDashboard,
    IconUser,
    IconChartBar,
    IconSettings,
    IconLock,
    IconTrash,
    IconWand
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { getBoards, createBoard, closeBoard, deleteBoard, reopenBoard, createColumn, type BoardSummary } from '../api/boards';
import { getMyWorkspaces, createWorkspace, type Workspace } from '../api/workspaces';
import { createTask } from '../api/tasks';
import { generateBoardStructure, getApiKey } from '../api/ai';
import { BOARD_THEMES, type ThemeColor } from '../constants/themes';
import { BOARD_TEMPLATES, type TemplateType } from '../constants/templates';

export default function BoardsPage() {
    const navigate = useNavigate();
    const computedColorScheme = useComputedColorScheme('dark');
    const [boards, setBoards] = useState<BoardSummary[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [openedWorkspaceModal, setOpenedWorkspaceModal] = useState(false);

    // Board Creation State
    const [newBoardName, setNewBoardName] = useState('');
    const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('blue');
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('kanban');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Workspace Creation State
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceDesc, setWorkspaceDesc] = useState('');
    const [creatingWorkspace, setCreatingWorkspace] = useState(false);

    // Board Action State
    const [closeBoardTarget, setCloseBoardTarget] = useState<number | null>(null);
    const [deleteBoardTarget, setDeleteBoardTarget] = useState<number | null>(null);
    const [closedBoardsModalOpen, setClosedBoardsModalOpen] = useState(false);

    // AI Architect State
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [projectIdea, setProjectIdea] = useState('');
    const [projectType, setProjectType] = useState<string | null>("Kanban");
    const [isGeneratingBoard, setIsGeneratingBoard] = useState(false);

    // Sidebar State
    const [user, setUser] = useState<{ username: string, email: string } | null>(null);

    useEffect(() => {
        fetchData();
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const fetchData = async () => {
        try {
            const [boardsData, workspacesData] = await Promise.all([
                getBoards(),
                getMyWorkspaces()
            ]);
            setBoards(boardsData);
            setWorkspaces(workspacesData);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to load data.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newBoardName.trim()) return;
        setCreating(true);
        try {
            const template = BOARD_TEMPLATES[selectedTemplate];

            if (!selectedWorkspaceId) {
                notifications.show({ title: 'Error', message: 'Please select a workspace.', color: 'red' });
                return;
            }

            const board = await createBoard(
                newBoardName,
                parseInt(selectedWorkspaceId),
                selectedTheme,
                true // Always skip default columns to use template structure
            );

            if (template && template.columns.length > 0) {
                notifications.show({ title: 'Template', message: `Initializing ${template.name} structure...`, color: 'blue', loading: true });
                for (const colName of template.columns) {
                    await createColumn(board.id, colName);
                }
            }

            setNewBoardName('');
            setSelectedWorkspaceId(null);
            setSelectedTheme('blue');
            setSelectedTemplate('kanban');
            setModalOpen(false);
            fetchData();
            notifications.clean();
            notifications.show({ title: 'Board created!', message: `"${newBoardName}" is ready.`, color: 'green' });
            navigate(`/boards/${board.id}`);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to create board.', color: 'red' });
        } finally {
            setCreating(false);
        }
    };

    const handleCreateWorkspace = async () => {
        if (!workspaceName.trim()) return;
        setCreatingWorkspace(true);
        try {
            await createWorkspace({ name: workspaceName, description: workspaceDesc });
            notifications.show({ title: 'Success', message: 'Workspace created!', color: 'green' });
            setOpenedWorkspaceModal(false);
            setWorkspaceName('');
            setWorkspaceDesc('');
            fetchData();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to create workspace.', color: 'red' });
        } finally {
            setCreatingWorkspace(false);
        }
    };

    const handleCloseBoard = async () => {
        if (!closeBoardTarget) return;
        try {
            await closeBoard(closeBoardTarget);
            notifications.show({ title: 'Success', message: 'Board closed successfully.', color: 'green' });
            setCloseBoardTarget(null);
            fetchData();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to close board.', color: 'red' });
        }
    };

    const handleDeleteBoard = async () => {
        if (!deleteBoardTarget) return;
        try {
            await deleteBoard(deleteBoardTarget);
            notifications.show({ title: 'Success', message: 'Board deleted permanently.', color: 'green' });
            setDeleteBoardTarget(null);
            fetchData();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to delete board.', color: 'red' });
        }
    };

    const handleReopenBoard = async (boardId: number) => {
        try {
            await reopenBoard(boardId);
            notifications.show({ title: 'Success', message: 'Board reopened successfully.', color: 'green' });
            fetchData();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to reopen board.', color: 'red' });
        }
    };

    const handleGenerateBoard = async () => {
        if (!projectIdea.trim()) return;

        if (!selectedWorkspaceId) {
            notifications.show({ title: 'Workspace Required', message: 'Please select a workspace for the AI generated board.', color: 'red' });
            return;
        }

        if (!getApiKey()) {
            notifications.show({
                title: 'AI Key Required',
                message: (
                    <Stack gap={8}>
                        <Text size="sm">Please add your OpenRouter API key in your profile settings to use AI features.</Text>
                        <Button
                            size="xs"
                            variant="light"
                            color="cyan"
                            onClick={() => {
                                navigate('/profile#ai-configuration');
                                notifications.clean();
                            }}
                        >
                            Configure AI Settings
                        </Button>
                    </Stack>
                ),
                color: 'orange',
                autoClose: 10000
            });
            return;
        }

        setIsGeneratingBoard(true);
        try {
            notifications.show({ title: 'AI Architect', message: `Designing your ${projectType} board structure...`, color: 'blue' });
            const structure = await generateBoardStructure(projectIdea, projectType || 'Kanban');

            notifications.show({ title: 'AI Architect', message: 'Creating board and columns...', color: 'blue' });
            // Truncate idea for board name or use default
            const ideaWords = projectIdea.split(' ');
            const boardName = ideaWords.length > 3 ? ideaWords.slice(0, 3).join(' ') + '...' : projectIdea;
            const themeMap: Record<string, string> = {
                'Kanban': 'blue',
                'Scrum': 'purple',
                'Sales/CRM': 'orange',
                'Content/Creative': 'pink',
                'Marketing': 'green',
                'Product Roadmap': 'blue',
                'Bug Tracking': 'red'
            };
            const theme = themeMap[projectType || ''] || 'purple';
            const newBoard = await createBoard(boardName, parseInt(selectedWorkspaceId), theme, true);

            const columnMap: Record<string, number> = {};
            for (let i = 0; i < structure.columns.length; i++) {
                const colName = structure.columns[i];
                const newCol = await createColumn(newBoard.id, colName); // no order argument
                columnMap[colName] = newCol.id;
            }

            notifications.show({ title: 'AI Architect', message: 'Populating initial tasks...', color: 'blue' });
            const firstColId = Object.values(columnMap)[0];
            for (const task of structure.tasks) {
                if (firstColId) {
                    await createTask(task.title, firstColId, task.description, task.priority);
                }
            }

            notifications.show({ title: 'Success', message: 'AI Board generated successfully!', color: 'green' });
            setAiModalOpen(false);
            setProjectIdea('');
            fetchData();
            navigate(`/boards/${newBoard.id}`);
        } catch (error) {
            notifications.show({ title: 'Generation Failed', message: 'Failed to generate board via AI.', color: 'red' });
        } finally {
            setIsGeneratingBoard(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100%',
                color: computedColorScheme === 'dark' ? 'white' : 'black',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Flex align="stretch" style={{ flex: 1 }}>
                {/* ─── NEW SIDEBAR (FULL HEIGHT DRAW) ─── */}
                <Box
                    style={{
                        width: 300,
                        flexShrink: 0,
                        background: computedColorScheme === 'dark' ? '#121214' : 'white',
                        borderRight: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                        padding: '30px 20px',
                        minHeight: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                    }}
                >

                    <Divider my="md" color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />

                    <Group justify="space-between" mb="md" px={4}>
                        <Text size="sm" fw={800} c={computedColorScheme === 'dark' ? 'gray.4' : 'gray.6'} tt="uppercase" lts={1}>
                            Workspaces
                        </Text>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => setOpenedWorkspaceModal(true)}
                        >
                            <IconPlus size={16} />
                        </ActionIcon>
                    </Group>

                    <Stack gap={4} style={{ overflowY: 'auto', flex: 1 }}>
                        {workspaces.map(w => (
                            <NavLink
                                key={w.id}
                                label={w.name}
                                leftSection={
                                    <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'indigo' }} size="md" radius="sm">
                                        <Text size="sm" fw={700}>{w.name[0]}</Text>
                                    </ThemeIcon>
                                }
                                childrenOffset={28}
                                style={{ borderRadius: 8, fontWeight: 600, fontSize: '16px', marginBottom: 4 }}
                            >
                                <NavLink
                                    label="Overview"
                                    leftSection={<IconChartBar size={16} />}
                                    style={{ borderRadius: 8, fontSize: '15px', fontWeight: 500 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/workspaces/${w.id}?tab=overview`);
                                    }}
                                />
                                <NavLink
                                    label="Boards"
                                    leftSection={<IconLayoutDashboard size={16} />}
                                    style={{ borderRadius: 8, fontSize: '15px', fontWeight: 500 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/workspaces/${w.id}?tab=boards`);
                                    }}
                                />
                                <NavLink
                                    label="Members"
                                    leftSection={<IconUser size={16} />}
                                    style={{ borderRadius: 8, fontSize: '15px', fontWeight: 500 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/workspaces/${w.id}?tab=members`);
                                    }}
                                />
                            </NavLink>
                        ))}
                    </Stack>

                    <NavLink
                        label={`Closed Boards (${boards.filter(b => b.isClosed).length})`}
                        leftSection={<IconLock size={16} />}
                        style={{ borderRadius: 8, fontSize: '15px', fontWeight: 500, marginBottom: 12 }}
                        onClick={() => setClosedBoardsModalOpen(true)}
                    />

                    <Button
                        variant="subtle"
                        leftSection={<IconPlus size={16} />}
                        color="dimmed"
                        justify="flex-start"
                        size="sm"
                        fullWidth
                        onClick={() => setOpenedWorkspaceModal(true)}
                        mt="auto"
                        style={{ border: `1px dashed ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'}` }}
                    >
                        Create Workspace
                    </Button>
                </Box>

                {/* ─── MAIN CONTENT (FULL WIDTH LAYOUT) ─── */}
                <Box style={{ flex: 1, padding: '40px 60px', maxWidth: '1400px', margin: '0 auto' }}>

                    {/* HERO SECTION */}
                    <Box
                        mb={60}
                        p={40}
                        style={{
                            borderRadius: 24,
                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)',
                            position: 'relative',
                            overflow: 'hidden',
                            border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
                            boxShadow: computedColorScheme === 'dark' ? 'inset 0 0 100px rgba(124, 58, 237, 0.05)' : 'none'
                        }}
                    >
                        {/* Decorative aura balls */}
                        <Box style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(124, 58, 237, 0.2)', filter: 'blur(50px)' }} />
                        <Box style={{ position: 'absolute', bottom: -50, left: 200, width: 200, height: 200, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', filter: 'blur(50px)' }} />

                        <Box style={{ position: 'relative', zIndex: 1 }}>
                            <Title
                                order={1}
                                size={48}
                                fw={800}
                                c={computedColorScheme === 'dark' ? 'white' : 'dark'}
                                mb="xs"
                                style={{ letterSpacing: -1.5 }}
                            >
                                Good evening, <Text span variant="gradient" gradient={{ from: 'violet', to: 'cyan' }} inherit>{user?.username || 'User'}</Text>
                            </Title>
                            <Text c={computedColorScheme === 'dark' ? 'gray.4' : 'gray.7'} size="lg" mb="xl" fw={500}>
                                Here's what's happening with your projects today.
                            </Text>

                            <Group gap="lg">
                                <Paper p="lg" radius="xl" style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    backdropFilter: 'blur(10px)',
                                    minWidth: 220,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                                }}>
                                    <Text size="sm" c="violet.3" fw={700} tt="uppercase" lts={1}>Active Boards</Text>
                                    <Text fz={38} fw={800} c={computedColorScheme === 'dark' ? 'white' : 'dark'} style={{ lineHeight: 1 }}>{boards.filter(b => !b.isClosed).length}</Text>
                                </Paper>
                                <Paper p="lg" radius="xl" style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    backdropFilter: 'blur(10px)',
                                    minWidth: 220,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                                }}>
                                    <Text size="sm" c="blue.3" fw={700} tt="uppercase" lts={1}>Pending Tasks</Text>
                                    <Text fz={38} fw={800} c={computedColorScheme === 'dark' ? 'white' : 'dark'} style={{ lineHeight: 1 }}>{boards.filter(b => !b.isClosed).reduce((acc, b) => acc + (b.openTasksCount || 0), 0)}</Text>
                                </Paper>
                            </Group>
                        </Box>
                    </Box>

                    {/* Recent Boards - Horizontal Scroll Strips */}
                    <Box mb={60}>
                        <Title order={3} size="h4" c={computedColorScheme === 'dark' ? 'white' : 'dark'} fw={700} mb="lg">Recently Viewed</Title>
                        <Flex gap="md" style={{ overflowX: 'auto', paddingBottom: 10 }}>
                            {boards.slice(0, 4).map(board => (
                                <Paper
                                    key={board.id}
                                    p="md"
                                    radius="md"
                                    style={{
                                        minWidth: 260,
                                        background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'white',
                                        border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onClick={() => navigate(`/boards/${board.id}`)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.background = computedColorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'white';
                                    }}
                                >
                                    <Group mb="xs" justify="space-between">
                                        <Box
                                            style={{
                                                width: 40,
                                                height: 6,
                                                borderRadius: 4,
                                                background: BOARD_THEMES[board.themeColor as ThemeColor]?.background || 'gray'
                                            }}
                                        />
                                        <IconLayoutDashboard size={14} color="gray" />
                                    </Group>
                                    <Text fw={600} c={computedColorScheme === 'dark' ? 'white' : 'dark'} size="lg" mb={4}>{board.name}</Text>
                                    <Text size="xs" c="dimmed">
                                        {workspaces.find(w => w.id === board.workspaceId)?.name}
                                    </Text>
                                </Paper>
                            ))}
                        </Flex>
                    </Box>

                    <Divider my="xl" color={computedColorScheme === 'dark' ? 'dark.4' : 'gray.2'} />

                    <Group mb="xl" justify="space-between" align="center">
                        <Title order={3} size="h4" c={computedColorScheme === 'dark' ? 'white' : 'dark'} fw={700}>Your Workspaces</Title>
                        <Group>
                            <Button
                                variant="light"
                                color="grape"
                                size="xs"
                                onClick={() => setAiModalOpen(true)}
                                leftSection={<IconWand size={14} />}
                            >
                                AI Architect
                            </Button>
                            <Button
                                variant="light"
                                color="violet"
                                size="xs"
                                onClick={() => setOpenedWorkspaceModal(true)}
                                leftSection={<IconPlus size={14} />}
                            >
                                New Workspace
                            </Button>
                        </Group>
                    </Group>

                    {loading ? (
                        <Text c="dimmed" ta="center" mt={60}>Loading...</Text>
                    ) : (
                        <Box>
                            {workspaces.length === 0 ? (
                                <Box ta="center" mt={40}>
                                    <Title order={3} c={computedColorScheme === 'dark' ? 'white' : 'dark'}>No workspaces yet</Title>
                                    <Button
                                        mt="md"
                                        color="violet"
                                        onClick={() => setOpenedWorkspaceModal(true)}
                                    >
                                        Create Workspace
                                    </Button>
                                </Box>
                            ) : (
                                <>
                                    {/* Workspaces Section - ISLAND LIST LAYOUT */}
                                    {workspaces.map(workspace => {
                                        const workspaceBoards = boards.filter(b => b.workspaceId === workspace.id && !b.isClosed);
                                        return (
                                            <Paper
                                                key={workspace.id}
                                                mb={40}
                                                p="xl"
                                                radius="lg"
                                                style={{
                                                    background: computedColorScheme === 'dark' ? '#1A1B1E' : 'white',
                                                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.03)'
                                                }}
                                            >
                                                <Group mb="lg" justify="space-between">
                                                    <Group gap="sm">
                                                        <ThemeIcon variant="light" color="violet" size="lg" radius="md">
                                                            <Text fw={700} size="sm">{workspace.name[0]}</Text>
                                                        </ThemeIcon>
                                                        <Box>
                                                            <Title order={4} size="h4" c={computedColorScheme === 'dark' ? 'white' : 'dark'}>{workspace.name}</Title>
                                                            <Text size="xs" c="dimmed">Workspace</Text>
                                                        </Box>
                                                    </Group>
                                                    <Group>
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            color="gray"
                                                            onClick={() => {
                                                                setSelectedWorkspaceId(workspace.id.toString());
                                                                setModalOpen(true);
                                                            }}
                                                            leftSection={<IconPlus size={14} />}
                                                        >
                                                            Add Board
                                                        </Button>
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            color="gray"
                                                            onClick={() => navigate(`/workspaces/${workspace.id}`)}
                                                        >
                                                            Settings
                                                        </Button>
                                                    </Group>
                                                </Group>

                                                {workspaceBoards.length === 0 ? (
                                                    <Text c="dimmed" ta="center" py="lg" size="sm" style={{ border: `1px dashed ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'}`, borderRadius: 8 }}>
                                                        No boards. <Text span c="violet" style={{ cursor: 'pointer' }} onClick={() => {
                                                            setSelectedWorkspaceId(workspace.id.toString());
                                                            setModalOpen(true);
                                                        }}>Create one?</Text>
                                                    </Text>
                                                ) : (
                                                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                                                        {workspaceBoards.map((board) => (
                                                            <Card
                                                                key={board.id}
                                                                padding="lg"
                                                                radius="md"
                                                                onClick={() => navigate(`/boards/${board.id}`)}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    backgroundColor: computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8f9fa',
                                                                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`,
                                                                    transition: 'all 0.2s ease',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                    e.currentTarget.style.backgroundColor = computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8f9fa';
                                                                    e.currentTarget.style.borderColor = computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)';
                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                }}
                                                            >
                                                                <Group mb="md" justify="space-between" align="center">
                                                                    <Box
                                                                        style={{
                                                                            width: 48,
                                                                            height: 6,
                                                                            borderRadius: 4,
                                                                            background: BOARD_THEMES[board.themeColor as ThemeColor]?.background || 'gray'
                                                                        }}
                                                                    />
                                                                    <Menu withinPortal zIndex={1000}>
                                                                        <Menu.Target>
                                                                            <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
                                                                                <IconSettings size={16} />
                                                                            </ActionIcon>
                                                                        </Menu.Target>
                                                                        <Menu.Dropdown>
                                                                            {!board.isClosed ? (
                                                                                <Menu.Item leftSection={<IconLock size={14} />} onClick={(e) => { e.stopPropagation(); setCloseBoardTarget(board.id); }}>
                                                                                    Close Board
                                                                                </Menu.Item>
                                                                            ) : (
                                                                                <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={(e) => { e.stopPropagation(); setDeleteBoardTarget(board.id); }}>
                                                                                    Delete Board
                                                                                </Menu.Item>
                                                                            )}
                                                                        </Menu.Dropdown>
                                                                    </Menu>
                                                                </Group>

                                                                <Text fw={700} size="lg" c={computedColorScheme === 'dark' ? 'white' : 'dark'} mb={4}>{board.name}</Text>
                                                                <Text size="sm" c="dimmed" mb="lg">Updated recently</Text>

                                                                <Group justify="space-between" align="center">
                                                                    {/* Mock Members Area */}
                                                                    <Group gap={-8}>
                                                                        <Box style={{ width: 28, height: 28, borderRadius: '50%', background: '#7950f2', border: `2px solid ${computedColorScheme === 'dark' ? '#1A1B1E' : '#ffffff'}`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' }}>A</Box>
                                                                        <Box style={{ width: 28, height: 28, borderRadius: '50%', background: '#228be6', border: `2px solid ${computedColorScheme === 'dark' ? '#1A1B1E' : '#ffffff'}`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' }}>B</Box>
                                                                    </Group>
                                                                    <Text size="xs" fw={600} c="dimmed">Open Tasks: {board.openTasksCount}</Text>
                                                                </Group>
                                                            </Card>
                                                        ))}
                                                    </SimpleGrid>
                                                )}
                                            </Paper>
                                        );
                                    })}

                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </Flex>

            {/* Create Board Modal */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Create New Board"
                centered
                radius="lg"
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white' },
                    header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white' },
                }}
            >
                <Select
                    label="Workspace"
                    placeholder="Select a workspace"
                    data={workspaces.map(w => ({ value: w.id.toString(), label: w.name }))}
                    value={selectedWorkspaceId}
                    onChange={setSelectedWorkspaceId}
                    mb="md"
                    searchable
                    required
                />

                <Text size="sm" fw={500} mb={4}>Board Theme</Text>
                <Group gap="xs" mb="md">
                    {Object.entries(BOARD_THEMES).map(([key, value]) => (
                        <ThemeIcon
                            key={key}
                            size="lg"
                            radius="xl"
                            style={{
                                cursor: 'pointer',
                                backgroundColor: value.background,
                                border: selectedTheme === key ? `2px solid ${computedColorScheme === 'dark' ? 'white' : 'black'}` : 'none',
                                boxShadow: selectedTheme === key ? `0 0 0 2px ${computedColorScheme === 'dark' ? '#000' : '#fff'}` : 'none'
                            }}
                            onClick={() => setSelectedTheme(key as ThemeColor)}
                        >
                            {selectedTheme === key && <IconCheck size={14} />}
                        </ThemeIcon>
                    ))}
                </Group>

                <Select
                    label="Board Template"
                    placeholder="Choose a starting structure"
                    data={Object.entries(BOARD_TEMPLATES).map(([key, t]) => ({ value: key, label: t.name }))}
                    value={selectedTemplate}
                    onChange={(val) => setSelectedTemplate(val as TemplateType)}
                    mb={4}
                />
                <Text size="xs" c="dimmed" mb="md">
                    {BOARD_TEMPLATES[selectedTemplate]?.description}
                </Text>

                <TextInput
                    label="Board Name"
                    placeholder="e.g. Sprint 1, Project Alpha"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.currentTarget.value)}
                    mb="md"
                    styles={{ input: { background: computedColorScheme === 'dark' ? 'rgba(0,0,0,0.4)' : '#f1f3f5' } }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <Group justify="flex-end">
                    <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="filled"
                        color="violet"
                        loading={creating}
                        onClick={handleCreate}
                    >
                        Create
                    </Button>
                </Group>
            </Modal>

            {/* Create Workspace Modal */}
            <Modal
                opened={openedWorkspaceModal}
                onClose={() => setOpenedWorkspaceModal(false)}
                title="Create Workspace"
                centered
                radius="lg"
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white' },
                    header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white' },
                }}
            >
                <TextInput
                    label="Workspace Name"
                    placeholder="e.g. Engineering, Marketing"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.currentTarget.value)}
                    mb="sm"
                    required
                />
                <TextInput
                    label="Description"
                    placeholder="Optional description"
                    value={workspaceDesc}
                    onChange={(e) => setWorkspaceDesc(e.currentTarget.value)}
                    mb="lg"
                />
                <Group justify="flex-end">
                    <Button variant="subtle" color="gray" onClick={() => setOpenedWorkspaceModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="filled"
                        color="violet"
                        loading={creatingWorkspace}
                        onClick={handleCreateWorkspace}
                    >
                        Create Workspace
                    </Button>
                </Group>
            </Modal>



            {/* Closed Boards Modal */}
            <Modal
                opened={closedBoardsModalOpen}
                onClose={() => setClosedBoardsModalOpen(false)}
                title="Closed Boards"
                size="lg"
                centered
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                    header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                }}
            >
                <Stack>
                    {boards.filter(b => b.isClosed).length === 0 ? (
                        <Text c="dimmed" ta="center" py="xl">No closed boards yet.</Text>
                    ) : (
                        boards.filter(b => b.isClosed).map(board => (
                            <Paper
                                key={board.id}
                                p="md"
                                radius="md"
                                withBorder
                                style={{
                                    background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8f9fa',
                                    borderColor: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                                }}
                            >
                                <Group justify="space-between">
                                    <Stack gap={2}>
                                        <Text fw={600}>{board.name}</Text>
                                        <Text size="xs" c="dimmed">Closed on {new Date(board.createdAt).toLocaleDateString()}</Text>
                                    </Stack>
                                    <Group gap="xs">
                                        <Button
                                            variant="light"
                                            color="blue"
                                            size="xs"
                                            onClick={() => navigate(`/boards/${board.id}`)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="light"
                                            color="violet"
                                            size="xs"
                                            onClick={() => handleReopenBoard(board.id)}
                                        >
                                            Reopen
                                        </Button>
                                        <ActionIcon
                                            variant="subtle"
                                            color="red"
                                            size="sm"
                                            onClick={() => setDeleteBoardTarget(board.id)}
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Paper>
                        ))
                    )}
                </Stack>
            </Modal>

            {/* AI Architect Modal */}
            <Modal
                opened={aiModalOpen}
                onClose={() => { setAiModalOpen(false); setSelectedWorkspaceId(null); }}
                title="AI Board Architect"
                centered
                radius="lg"
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white' },
                    header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white' },
                }}
            >
                <Text size="sm" c="dimmed" mb="md">
                    Choose a project type and describe your dream board. Our AI will handle the rest!
                </Text>

                <Select
                    label="Workspace"
                    placeholder="Select a workspace"
                    data={workspaces.map(w => ({ value: w.id.toString(), label: w.name }))}
                    value={selectedWorkspaceId}
                    onChange={setSelectedWorkspaceId}
                    mb="md"
                    searchable
                    required
                    withAsterisk
                />

                <Select
                    label="Project Type"
                    placeholder="Choose a structure"
                    mb="md"
                    data={[
                        { value: 'Kanban', label: 'Kanban (Standard)' },
                        { value: 'Scrum', label: 'Scrum (Dev Sprints)' },
                        { value: 'Sales/CRM', label: 'Sales (Pipeline)' },
                        { value: 'Content/Creative', label: 'Content (Production)' },
                        { value: 'Marketing', label: 'Marketing (Campaign)' },
                        { value: 'Product Roadmap', label: 'Roadmap (High-level)' },
                        { value: 'Bug Tracking', label: 'QA (Bug Tracker)' }
                    ]}
                    value={projectType}
                    onChange={setProjectType}
                    required
                />

                <TextInput
                    label="Project Description"
                    placeholder="e.g. A mobile app for tracking daily water intake"
                    value={projectIdea}
                    onChange={(e) => setProjectIdea(e.currentTarget.value)}
                    mb="lg"
                    styles={{ input: { background: computedColorScheme === 'dark' ? 'rgba(0,0,0,0.4)' : '#f1f3f5' } }}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateBoard()}
                />
                <Group justify="flex-end">
                    <Button variant="subtle" color="gray" onClick={() => setAiModalOpen(false)} disabled={isGeneratingBoard}>
                        Cancel
                    </Button>
                    <Button
                        variant="filled"
                        color="grape"
                        loading={isGeneratingBoard}
                        onClick={handleGenerateBoard}
                        leftSection={!isGeneratingBoard && <IconWand size={16} />}
                    >
                        Generate Board
                    </Button>
                </Group>
            </Modal>

            {/* Board Close Confirmation Modal */}
            <Modal
                opened={closeBoardTarget !== null}
                onClose={() => setCloseBoardTarget(null)}
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
                        <Button variant="subtle" color="gray" onClick={() => setCloseBoardTarget(null)}>Cancel</Button>
                        <Button color="red" onClick={handleCloseBoard}>Close Board</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Board Delete Confirmation Modal */}
            <Modal
                opened={deleteBoardTarget !== null}
                onClose={() => setDeleteBoardTarget(null)}
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
                        <Button variant="subtle" color="gray" onClick={() => setDeleteBoardTarget(null)}>Cancel</Button>
                        <Button color="red" onClick={handleDeleteBoard}>Delete Permanently</Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}
