import { useEffect, useState } from 'react';
import {
    Container,
    Title,
    SimpleGrid,
    Card,
    Text,
    Button,
    Modal,
    TextInput,
    Group,
    Box,
    Badge,
    ActionIcon,
    Select,
    ThemeIcon,
    Paper,
    Divider,
} from '@mantine/core';
import { IconPlus, IconLogout, IconCheck, IconBriefcase, IconMail } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { getBoards, createBoard, type BoardSummary } from '../api/boards';
import { getMyWorkspaces, createWorkspace, getWorkspaceInvitations, respondToWorkspaceInvitation, type Workspace } from '../api/workspaces';
import { BOARD_THEMES, type ThemeColor } from '../constants/themes';

export default function BoardsPage() {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<BoardSummary[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [invitations, setInvitations] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('blue');
    const [creating, setCreating] = useState(false);

    // Workspace Creation State
    const [openedWorkspaceModal, setOpenedWorkspaceModal] = useState(false);
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceDesc, setWorkspaceDesc] = useState('');
    const [creatingWorkspace, setCreatingWorkspace] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [boardsData, workspacesData, invitationsData] = await Promise.all([
                getBoards(),
                getMyWorkspaces(),
                getWorkspaceInvitations()
            ]);
            setBoards(boardsData);
            setWorkspaces(workspacesData);
            setInvitations(invitationsData);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to load data.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleRespondToWorkspaceInvitation = async (workspaceId: number, accept: boolean) => {
        try {
            await respondToWorkspaceInvitation(workspaceId, accept);
            notifications.show({
                title: accept ? 'Joined Workspace' : 'Declined',
                message: accept ? 'You have joined the workspace.' : 'Invitation declined.',
                color: accept ? 'green' : 'blue'
            });
            fetchData();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to respond to invitation.', color: 'red' });
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: '#141517', // Professional dark gray (Mantine dark.7/8ish)
            }}
        >
            <Container size="lg" py="xl">
                {/* Invitations Section */}
                {invitations.length > 0 && (
                    <Box mb="xl">
                        <Title order={3} c="white" mb="md">Pending Workspace Invitations</Title>
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                            {invitations.map((inv) => (
                                <Card
                                    key={inv.id}
                                    shadow="sm"
                                    padding="lg"
                                    radius="md"
                                    withBorder
                                    style={{
                                        background: '#25262b', // Lighter dark gray
                                        borderColor: '#373A40',
                                    }}
                                >
                                    <Group mb="xs">
                                        <IconMail size={20} color="orange" />
                                        <Text fw={600} size="lg" c="white">{inv.name}</Text>
                                    </Group>
                                    <Text size="sm" c="dimmed" mb="md">
                                        Invited by {inv.ownerName}
                                    </Text>
                                    <Group grow>
                                        <Button
                                            variant="light"
                                            color="green"
                                            onClick={() => handleRespondToWorkspaceInvitation(inv.id, true)}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            variant="light"
                                            color="red"
                                            onClick={() => handleRespondToWorkspaceInvitation(inv.id, false)}
                                        >
                                            Decline
                                        </Button>
                                    </Group>
                                </Card>
                            ))}
                        </SimpleGrid>
                        <Divider my="xl" color="rgba(255,255,255,0.1)" />
                    </Box>
                )}

                {/* Header */}
                <Group justify="space-between" mb="xl">
                    <div>
                        <Title
                            order={1}
                            fw={800}
                            c="white"
                        >
                            Workspaces
                        </Title>
                        <Text c="dimmed" size="sm">
                            Manage your projects and teams
                        </Text>
                    </div>
                    <Group>
                        <Button
                            leftSection={<IconPlus size={18} />}
                            variant="default"
                            onClick={() => {
                                setSelectedWorkspaceId(null);
                                setModalOpen(true);
                            }}
                            radius="md"
                        >
                            New Board
                        </Button>
                        <Button
                            leftSection={<IconBriefcase size={18} />}
                            color="violet"
                            onClick={() => setOpenedWorkspaceModal(true)}
                            radius="md"
                        >
                            Create Workspace
                        </Button>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            onClick={handleLogout}
                            title="Logout"
                        >
                            <IconLogout size={20} />
                        </ActionIcon>
                    </Group>
                </Group>

                {/* Invitations Section */}


                {loading ? (
                    <Text c="dimmed" ta="center" mt={60}>Loading...</Text>
                ) : (
                    <Box>
                        {workspaces.length === 0 ? (
                            <Box ta="center" mt={80}>
                                <ThemeIcon size={80} radius="xl" variant="gradient" gradient={{ from: 'violet', to: 'indigo' }}>
                                    <IconBriefcase size={40} />
                                </ThemeIcon>
                                <Title order={2} c="white" mt="xl">No workspaces yet</Title>
                                <Text c="dimmed" size="lg" mt="sm" mb="xl">
                                    Create a workspace to start organizing your boards.
                                </Text>
                                <Button
                                    size="lg"
                                    variant="gradient"
                                    gradient={{ from: 'violet', to: 'indigo' }}
                                    onClick={() => setOpenedWorkspaceModal(true)}
                                >
                                    Create your first Workspace
                                </Button>
                            </Box>
                        ) : (
                            <>
                                {/* Workspaces Section */}
                                {workspaces.map(workspace => {
                                    const workspaceBoards = boards.filter(b => b.workspaceId === workspace.id);
                                    return (
                                        <Box key={workspace.id} mb={50}>
                                            <Group mb="md" justify="space-between">
                                                <Group>
                                                    <ThemeIcon variant="light" color="violet" size="lg" radius="md">
                                                        <IconBriefcase size={20} />
                                                    </ThemeIcon>
                                                    <div>
                                                        <Title order={3} c="white">{workspace.name}</Title>
                                                        {workspace.description && <Text c="dimmed" size="sm">{workspace.description}</Text>}
                                                    </div>
                                                </Group>
                                                <Group>
                                                    <Button
                                                        variant="light"
                                                        size="xs"
                                                        color="violet"
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
                                                        Details
                                                    </Button>
                                                </Group>
                                            </Group>

                                            {workspaceBoards.length === 0 ? (
                                                <Paper p="xl" withBorder style={{
                                                    background: 'transparent',
                                                    borderColor: 'rgba(255,255,255,0.05)',
                                                    borderStyle: 'dashed'
                                                }}>
                                                    <Text c="dimmed" ta="center" size="sm">
                                                        No boards in this workspace. <Text span c="violet" style={{ cursor: 'pointer' }} onClick={() => {
                                                            setSelectedWorkspaceId(workspace.id.toString());
                                                            setModalOpen(true);
                                                        }}>Create one?</Text>
                                                    </Text>
                                                </Paper>
                                            ) : (
                                                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                                                    {workspaceBoards.map((board) => (
                                                        <Card
                                                            key={board.id}
                                                            shadow="sm"
                                                            padding="lg"
                                                            radius="md"
                                                            withBorder
                                                            onClick={() => navigate(`/boards/${board.id}`)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                background: '#25262b',
                                                                borderColor: '#373A40',
                                                                transition: 'all 0.2s ease',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.borderColor = '#5c5f66';
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.borderColor = '#373A40';
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                            }}
                                                        >
                                                            <div style={{
                                                                height: 6,
                                                                background: BOARD_THEMES[board.themeColor as ThemeColor]?.background || 'gray',
                                                                borderRadius: 4,
                                                                marginBottom: 12
                                                            }} />
                                                            <Text fw={600} size="md" c="white" mb={4}>{board.name}</Text>
                                                            <Group gap={6}>
                                                                <Badge variant="light" color={board.role === 'Owner' ? 'violet' : 'teal'} size="xs">
                                                                    {board.role}
                                                                </Badge>
                                                            </Group>
                                                        </Card>
                                                    ))}
                                                </SimpleGrid>
                                            )}
                                        </Box>
                                    );
                                })}

                                {/* Personal / Guest Boards Section - Only show if exist */}
                                {boards.filter(b => !b.workspaceId).length > 0 && (
                                    <Box mb="xl" mt={50}>
                                        <Title order={4} c="dimmed" mb="md" tt="uppercase" lts={1}>Guest Boards</Title>
                                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                                            {boards.filter(b => !b.workspaceId).map((board) => (
                                                <Card
                                                    key={board.id}
                                                    shadow="sm"
                                                    padding="lg"
                                                    radius="md"
                                                    withBorder
                                                    onClick={() => navigate(`/boards/${board.id}`)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        background: '#25262b',
                                                        borderColor: '#373A40',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.borderColor = '#5c5f66';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.borderColor = '#373A40';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <Group justify="space-between" mb="xs">
                                                        <Text fw={600} size="md" c="white">{board.name}</Text>
                                                    </Group>
                                                    <Text size="xs" c="dimmed">Personal Board</Text>
                                                </Card>
                                            ))}
                                        </SimpleGrid>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                )}

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
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'indigo' }}
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
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'indigo' }}
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
