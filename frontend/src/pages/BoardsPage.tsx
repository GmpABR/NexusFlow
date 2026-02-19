import { useEffect, useState } from 'react';
import {
    Container,
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
    Divider
} from '@mantine/core';
import {
    IconPlus,
    IconCheck,
    IconLayoutDashboard,
    IconHome,
    IconUser,
    IconSettings
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { getBoards, createBoard, type BoardSummary } from '../api/boards';
import { getMyWorkspaces, createWorkspace, type Workspace } from '../api/workspaces';
import { BOARD_THEMES, type ThemeColor } from '../constants/themes';

export default function BoardsPage() {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<BoardSummary[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [openedWorkspaceModal, setOpenedWorkspaceModal] = useState(false);

    // Board Creation State
    const [newBoardName, setNewBoardName] = useState('');
    const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('blue');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Workspace Creation State
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceDesc, setWorkspaceDesc] = useState('');
    const [creatingWorkspace, setCreatingWorkspace] = useState(false);

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
            await createBoard(
                newBoardName,
                selectedWorkspaceId ? parseInt(selectedWorkspaceId) : undefined,
                selectedTheme
            );
            setNewBoardName('');
            setSelectedWorkspaceId(null);
            setSelectedTheme('blue');
            setModalOpen(false);
            fetchData();
            notifications.show({ title: 'Board created!', message: `"${newBoardName}" is ready.`, color: 'green' });
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

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'radial-gradient(circle at 15% 15%, #1f2023 0%, #141517 100%)', // Subtle lighting
                color: 'white',
                paddingTop: 40,
                paddingBottom: 40,
                paddingLeft: 40,
                paddingRight: 40
            }}
        >
            <Container size="xl" p={0}>
                <Flex gap={40} align="stretch">
                    {/* ─── NEW SIDEBAR (FLOATING DOCK STYLE) ─── */}
                    <Box
                        style={{
                            width: 260,
                            flexShrink: 0,
                            background: 'rgba(20, 21, 23, 0.8)', // Semi-transparent
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 16,
                            padding: 20,
                            height: 'calc(100vh - 120px)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Stack gap={10} mb="xl">
                            <NavLink
                                label="Overview"
                                leftSection={<IconHome size={20} />}
                                active
                                variant="light"
                                color="violet"
                                style={{ borderRadius: 8, fontWeight: 700, fontSize: '15px' }}
                            />
                            <NavLink
                                label="My Boards"
                                leftSection={<IconLayoutDashboard size={20} />}
                                style={{ borderRadius: 8, fontWeight: 600, fontSize: '15px' }}
                            />
                            <NavLink
                                label="Settings"
                                leftSection={<IconSettings size={20} />}
                                style={{ borderRadius: 8, fontWeight: 600, fontSize: '15px' }}
                            />
                        </Stack>

                        <Divider my="md" color="rgba(255,255,255,0.1)" />

                        <Group justify="space-between" mb="md" px={4}>
                            <Text size="sm" fw={800} c="gray.4" tt="uppercase" lts={1}>
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
                                    <NavLink
                                        label="Settings"
                                        leftSection={<IconSettings size={16} />}
                                        style={{ borderRadius: 8, fontSize: '15px', fontWeight: 500 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/workspaces/${w.id}`);
                                        }}
                                    />
                                </NavLink>
                            ))}
                        </Stack>

                        <Button
                            variant="subtle"
                            leftSection={<IconPlus size={16} />}
                            color="dimmed"
                            justify="flex-start"
                            size="sm"
                            fullWidth
                            onClick={() => setOpenedWorkspaceModal(true)}
                            mt="auto"
                            style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
                        >
                            Create Workspace
                        </Button>
                    </Box>

                    {/* ─── MAIN CONTENT (UNIQUE DESIGN) ─── */}
                    <Box style={{ flex: 1, paddingLeft: 20, maxWidth: 1000 }}>

                        {/* HERO SECTION */}
                        <Box mb={50}>
                            <Title
                                order={1}
                                size={42}
                                fw={800}
                                c="white"
                                mb="xs"
                                style={{ letterSpacing: -1 }}
                            >
                                Good evening, <Text span variant="gradient" gradient={{ from: 'violet', to: 'cyan' }} inherit>{user?.username || 'User'}</Text>
                            </Title>
                            <Text c="dimmed" size="lg" mb="xl">
                                Here's what's happening with your projects today.
                            </Text>

                            <Group gap="md">
                                <Paper p="md" radius="md" style={{ background: '#25262b', minWidth: 200, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Active Boards</Text>
                                    <Text size="xl" fw={700} c="white">{boards.length}</Text>
                                </Paper>
                                <Paper p="md" radius="md" style={{ background: '#25262b', minWidth: 200, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Pending Tasks</Text>
                                    <Text size="xl" fw={700} c="white">12</Text> {/* Mock data for now */}
                                </Paper>
                            </Group>
                        </Box>

                        {/* Recent Boards - Horizontal Scroll Strips */}
                        <Box mb={60}>
                            <Title order={3} size="h4" c="white" fw={700} mb="lg">Recently Viewed</Title>
                            <Flex gap="md" style={{ overflowX: 'auto', paddingBottom: 10 }}>
                                {boards.slice(0, 4).map(board => (
                                    <Paper
                                        key={board.id}
                                        p="md"
                                        radius="md"
                                        style={{
                                            minWidth: 260,
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)',
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
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
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
                                        <Text fw={600} c="white" size="lg" mb={4}>{board.name}</Text>
                                        <Text size="xs" c="dimmed">
                                            {workspaces.find(w => w.id === board.workspaceId)?.name || 'Personal'}
                                        </Text>
                                    </Paper>
                                ))}
                            </Flex>
                        </Box>

                        <Divider my="xl" color="dark.4" />

                        <Group mb="xl" justify="space-between" align="center">
                            <Title order={3} size="h4" c="white" fw={700}>Your Workspaces</Title>
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

                        {loading ? (
                            <Text c="dimmed" ta="center" mt={60}>Loading...</Text>
                        ) : (
                            <Box>
                                {workspaces.length === 0 ? (
                                    <Box ta="center" mt={40}>
                                        <Title order={3} c="white">No workspaces yet</Title>
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
                                            const workspaceBoards = boards.filter(b => b.workspaceId === workspace.id);
                                            return (
                                                <Paper
                                                    key={workspace.id}
                                                    mb={40}
                                                    p="xl"
                                                    radius="lg"
                                                    style={{
                                                        background: '#1A1B1E',
                                                        border: '1px solid rgba(255,255,255,0.08)'
                                                    }}
                                                >
                                                    <Group mb="lg" justify="space-between">
                                                        <Group gap="sm">
                                                            <ThemeIcon variant="light" color="violet" size="lg" radius="md">
                                                                <Text fw={700} size="sm">{workspace.name[0]}</Text>
                                                            </ThemeIcon>
                                                            <Box>
                                                                <Title order={4} size="h4" c="white">{workspace.name}</Title>
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
                                                        <Text c="dimmed" ta="center" py="lg" size="sm" style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }}>
                                                            No boards. <Text span c="violet" style={{ cursor: 'pointer' }} onClick={() => {
                                                                setSelectedWorkspaceId(workspace.id.toString());
                                                                setModalOpen(true);
                                                            }}>Create one?</Text>
                                                        </Text>
                                                    ) : (
                                                        <Stack gap="sm">
                                                            {workspaceBoards.map((board) => (
                                                                <Group
                                                                    key={board.id}
                                                                    p="md"
                                                                    className="board-row"
                                                                    style={{
                                                                        background: 'rgba(255,255,255,0.02)',
                                                                        borderRadius: 8,
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease',
                                                                        border: '1px solid transparent'
                                                                    }}
                                                                    onClick={() => navigate(`/boards/${board.id}`)}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                                                        e.currentTarget.style.borderColor = 'transparent';
                                                                    }}
                                                                >
                                                                    <Box
                                                                        style={{
                                                                            width: 12,
                                                                            height: 12,
                                                                            borderRadius: 4,
                                                                            background: BOARD_THEMES[board.themeColor as ThemeColor]?.background || 'gray'
                                                                        }}
                                                                    />
                                                                    <Box style={{ flex: 1 }}>
                                                                        <Text fw={600} size="sm" c="white">{board.name}</Text>
                                                                        <Text size="xs" c="dimmed">Last updated recently</Text>
                                                                    </Box>
                                                                    {/* Mock Members */}
                                                                    <Group gap={-8}>
                                                                        <Box style={{ width: 24, height: 24, borderRadius: '50%', background: '#violet', border: '2px solid #1A1B1E' }} />
                                                                        <Box style={{ width: 24, height: 24, borderRadius: '50%', background: '#blue', border: '2px solid #1A1B1E' }} />
                                                                    </Group>
                                                                    <IconSettings size={16} color="gray" style={{ opacity: 0.5 }} />
                                                                </Group>
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </Paper>
                                            );
                                        })}

                                        {/* Personal Boards Section */}
                                        {boards.filter(b => !b.workspaceId).length > 0 && (
                                            <Box mb="xl" mt={40}>
                                                <Title order={4} c="dimmed" mb="md" fw={500}>Personal Boards</Title>
                                                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                                                    {boards.filter(b => !b.workspaceId).map((board) => (
                                                        <Card
                                                            key={board.id}
                                                            padding="md"
                                                            radius="md"
                                                            withBorder
                                                            onClick={() => navigate(`/boards/${board.id}`)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                backgroundColor: '#25262b',
                                                                borderColor: '#373A40',
                                                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                                                                e.currentTarget.style.borderColor = 'var(--mantine-color-violet-8)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                                e.currentTarget.style.borderColor = '#373A40';
                                                            }}
                                                        >
                                                            <Group mb="sm" justify="space-between" align="start">
                                                                <Text fw={600} size="md" c="white" lineClamp={1} style={{ flex: 1 }}>{board.name}</Text>
                                                                <Box
                                                                    style={{
                                                                        width: 8,
                                                                        height: 8,
                                                                        borderRadius: '50%',
                                                                        backgroundColor: BOARD_THEMES[board.themeColor as ThemeColor]?.background || 'gray',
                                                                    }}
                                                                />
                                                            </Group>
                                                            <Text size="xs" c="dimmed">Personal</Text>
                                                        </Card>
                                                    ))}
                                                </SimpleGrid>
                                            </Box>
                                        )}
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
                        content: { background: '#1a1b1e' },
                        header: { background: '#1a1b1e' },
                    }}
                >
                    <Select
                        label="Workspace (Optional)"
                        placeholder="Select a workspace"
                        data={workspaces.map(w => ({ value: w.id.toString(), label: w.name }))}
                        value={selectedWorkspaceId}
                        onChange={setSelectedWorkspaceId}
                        mb="md"
                        searchable
                        clearable
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
                                    border: selectedTheme === key ? '2px solid white' : 'none',
                                    boxShadow: selectedTheme === key ? '0 0 0 2px #000' : 'none'
                                }}
                                onClick={() => setSelectedTheme(key as ThemeColor)}
                            >
                                {selectedTheme === key && <IconCheck size={14} />}
                            </ThemeIcon>
                        ))}
                    </Group>

                    <TextInput
                        label="Board Name"
                        placeholder="e.g. Sprint 1, Project Alpha"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.currentTarget.value)}
                        mb="md"
                        styles={{ input: { background: 'rgba(0,0,0,0.4)' } }}
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
                        content: { background: '#1a1b1e' },
                        header: { background: '#1a1b1e' },
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
            </Container>
        </Box>
    );
}
