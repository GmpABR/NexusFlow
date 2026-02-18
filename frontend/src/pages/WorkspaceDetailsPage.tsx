import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Button,
    Group,
    Box,
    Loader,
    Center,
    SimpleGrid,
    Card,
    Badge,
    Avatar,
    Paper,
    Stack,
    Tabs,
    Modal,
    Autocomplete,
    Menu,
    ActionIcon,
    ThemeIcon,
} from '@mantine/core';
import { IconLayoutBoard, IconUsers, IconPlus, IconArrowLeft, IconCheck, IconPalette } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { getWorkspace, getWorkspaceBoards, addWorkspaceMember, removeWorkspaceMember, type Workspace } from '../api/workspaces';
import { updateBoard, type BoardSummary } from '../api/boards';
import { searchUsers, type UserSummary } from '../api/users';
import { BOARD_THEMES, type ThemeColor } from '../constants/themes';

export default function WorkspaceDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [boards, setBoards] = useState<BoardSummary[]>([]);
    const [loading, setLoading] = useState(true);
    // Invite State
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchValue, 300);
    const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [inviting, setInviting] = useState(false);

    // Remove Member State
    const [removeModalOpen, setRemoveModalOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<number | null>(null);
    const [removing, setRemoving] = useState(false);

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

    const handleInvite = async () => {
        if (!searchValue || !workspace) return;
        setInviting(true);
        try {
            await addWorkspaceMember(workspace.id, searchValue);
            notifications.show({
                title: 'Invitation Sent',
                message: `An invitation has been sent to ${searchValue}.`,
                color: 'teal',
                icon: <IconCheck size={16} />,
                autoClose: 5000,
                withBorder: true,
                style: { backgroundColor: 'rgba(20, 184, 166, 0.1)', borderColor: 'rgba(20, 184, 166, 0.2)' }
            });
            setInviteModalOpen(false);
            setSearchValue('');
            setSearchResults([]);
            fetchWorkspace(workspace.id);
            fetchWorkspace(workspace.id);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to add member';
            notifications.show({ title: 'Error', message, color: 'red' });
        } finally {
            setInviting(false);
        }
    };

    const confirmRemoveMember = (userId: number) => {
        setMemberToRemove(userId);
        setRemoveModalOpen(true);
    };

    const handleRemoveMember = async () => {
        if (!workspace || !memberToRemove) return;
        setRemoving(true);
        try {
            await removeWorkspaceMember(workspace.id, memberToRemove);
            notifications.show({ title: 'Success', message: 'Member removed', color: 'blue' });
            fetchWorkspace(workspace.id);
            setRemoveModalOpen(false);
            setMemberToRemove(null);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Failed to remove member';
            notifications.show({ title: 'Error', message, color: 'red' });
        } finally {
            setRemoving(false);
        }
    };

    useEffect(() => {
        if (id) fetchWorkspace(parseInt(id));
    }, [id]);

    const fetchWorkspace = async (workspaceId: number) => {
        try {
            const [wsData, boardsData] = await Promise.all([
                getWorkspace(workspaceId),
                getWorkspaceBoards(workspaceId)
            ]);
            setWorkspace(wsData);
            setBoards(boardsData);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to load workspace.', color: 'red' });
            navigate('/boards');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTheme = async (boardId: number, color: ThemeColor) => {
        try {
            await updateBoard(boardId, { themeColor: color });
            setBoards(current => current.map(b =>
                b.id === boardId ? { ...b, themeColor: color } : b
            ));
            notifications.show({ title: 'Theme updated', message: 'Board theme changed.', color: 'green' });
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to update theme.', color: 'red' });
        }
    };

    if (loading) return <Center h="100vh"><Loader color="violet" /></Center>;
    if (!workspace) return null;

    return (
        <Box style={{ minHeight: '100vh', background: '#141517' }}>
            <Container size="lg" py="xl">
                <Button
                    variant="subtle"
                    color="gray"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => navigate('/boards')}
                    mb="lg"
                >
                    Back to Boards
                </Button>

                <Group justify="space-between" mb="xl">
                    <div>
                        <Title c="white">{workspace.name}</Title>
                        <Text c="dimmed">{workspace.description}</Text>
                    </div>
                </Group>

                <Tabs defaultValue="boards" variant="pills" radius="md" color="violet">
                    <Tabs.List mb="lg" style={{ background: '#25262b', padding: 4, borderRadius: 8, border: '1px solid #373A40' }}>
                        <Tabs.Tab value="boards" leftSection={<IconLayoutBoard size={16} />}>Boards</Tabs.Tab>
                        <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>Members</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="boards">
                        {boards.length === 0 ? (
                            <Text c="dimmed" ta="center" py="xl">No boards in this workspace yet.</Text>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                                {boards.map((board) => (
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
                                        <Group justify="space-between" mb="xs" align="flex-start">
                                            <Text fw={600} size="lg" c="white" style={{ flex: 1 }}>{board.name}</Text>

                                            {/* Theme Switcher - stopPropagation to prevent navigation */}
                                            {(board.role === 'Owner') && (
                                                <Menu shadow="md" width={200} position="bottom-end">
                                                    <Menu.Target>
                                                        <ActionIcon
                                                            variant="subtle"
                                                            color="gray"
                                                            size="sm"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <IconPalette size={16} />
                                                        </ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Label>Change Theme</Menu.Label>
                                                        <Group gap="xs" p="xs">
                                                            {Object.entries(BOARD_THEMES).map(([key, value]) => (
                                                                <ThemeIcon
                                                                    key={key}
                                                                    size="md"
                                                                    radius="xl"
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        backgroundColor: value.background,
                                                                        border: board.themeColor === key ? '2px solid white' : 'none',
                                                                        boxShadow: board.themeColor === key ? '0 0 0 2px #000' : 'none'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleUpdateTheme(board.id, key as ThemeColor);
                                                                    }}
                                                                >
                                                                    {board.themeColor === key && <IconCheck size={12} />}
                                                                </ThemeIcon>
                                                            ))}
                                                        </Group>
                                                    </Menu.Dropdown>
                                                </Menu>
                                            )}
                                        </Group>

                                        <Text size="xs" c="dimmed">
                                            Created {new Date(board.createdAt).toLocaleDateString()}
                                        </Text>
                                    </Card>
                                ))}
                            </SimpleGrid>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="members">
                        <Group justify="space-between" mb="md">
                            <Title order={4} c="white">Workspace Members</Title>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                color="violet"
                                onClick={() => setInviteModalOpen(true)}
                            >
                                Add Member
                            </Button>
                        </Group>
                        <Stack>
                            {workspace.members.map((member) => (
                                <Paper
                                    key={member.userId}
                                    p="md"
                                    radius="md"
                                    shadow="sm"
                                    withBorder
                                    style={{
                                        background: '#25262b',
                                        borderColor: '#373A40'
                                    }}
                                >
                                    <Group justify="space-between">
                                        <Group>
                                            <Avatar color="violet" radius="xl" size="md">{member.username.slice(0, 2).toUpperCase()}</Avatar>
                                            <div>
                                                <Text c="white" fw={500} size="sm">{member.username}</Text>
                                                <Text c="dimmed" size="xs" tt="capitalize">{member.role}</Text>
                                            </div>
                                        </Group>
                                        <Group gap="xs">
                                            {member.status === 'Pending' ? (
                                                <Badge color="yellow" variant="light">Pending</Badge>
                                            ) : (
                                                <Badge color={member.role === 'Admin' ? 'violet' : 'gray'}>{member.role}</Badge>
                                            )}
                                            {member.role !== 'Admin' && (
                                                <Button
                                                    variant="subtle"
                                                    color="red"
                                                    size="xs"
                                                    onClick={() => confirmRemoveMember(member.userId)}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </Group>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>

                <Modal
                    opened={inviteModalOpen}
                    onClose={() => setInviteModalOpen(false)}
                    title="Add Member to Workspace"
                    styles={{
                        content: { background: '#25262b', color: 'white' },
                        header: { background: '#25262b', color: 'white' },
                    }}
                >
                    <Stack>
                        <Autocomplete
                            label="Search User"
                            placeholder="Type username..."
                            data={searchResults.map(u => u.username)}
                            value={searchValue}
                            onChange={setSearchValue}
                            rightSection={searchLoading ? <Loader size="xs" /> : null}
                            mb="md"
                        />
                        <Group justify="flex-end">
                            <Button variant="default" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
                            <Button color="violet" onClick={handleInvite} loading={inviting}>Add</Button>
                        </Group>
                    </Stack>
                </Modal>

                <Modal
                    opened={removeModalOpen}
                    onClose={() => setRemoveModalOpen(false)}
                    title="Remove Member"
                    centered
                    styles={{
                        content: { background: '#25262b', color: 'white' },
                        header: { background: '#25262b', color: 'white' },
                    }}
                >
                    <Text size="sm" mb="lg">
                        Are you sure you want to remove this member from the workspace?
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setRemoveModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button color="red" onClick={handleRemoveMember} loading={removing}>
                            Remove
                        </Button>
                    </Group>
                </Modal>
            </Container>
        </Box >
    );
}
