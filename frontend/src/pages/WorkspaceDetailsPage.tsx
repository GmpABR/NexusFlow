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
} from '@mantine/core';
import { IconLayoutBoard, IconUsers, IconPlus, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { getWorkspace, getWorkspaceBoards, addWorkspaceMember, removeWorkspaceMember, type Workspace, type WorkspaceMember } from '../api/workspaces';
import { type BoardSummary } from '../api/boards';
import { searchUsers, type UserSummary } from '../api/users';

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

    if (loading) return <Center h="100vh"><Loader color="violet" /></Center>;
    if (!workspace) return null;

    return (
        <Box style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0010 0%, #000 100%)' }}>
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
                    {/* Add Settings/Invite buttons here later */}
                </Group>

                <Tabs defaultValue="boards" variant="pills" radius="md" color="violet">
                    <Tabs.List mb="lg">
                        <Tabs.Tab value="boards" leftSection={<IconLayoutBoard size={16} />}>Boards</Tabs.Tab>
                        <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>Members</Tabs.Tab>
                        {/* <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>Settings</Tabs.Tab> */}
                    </Tabs.List>

                    <Tabs.Panel value="boards">
                        {boards.length === 0 ? (
                            <Text c="dimmed" ta="center" py="xl">No boards in this workspace yet.</Text>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                                {boards.map((board) => (
                                    <Card
                                        key={board.id}
                                        shadow="md"
                                        padding="lg"
                                        radius="lg"
                                        withBorder
                                        onClick={() => navigate(`/boards/${board.id}`)}
                                        style={{
                                            cursor: 'pointer',
                                            background: 'rgba(26, 27, 30, 0.6)',
                                            backdropFilter: 'blur(12px)',
                                            borderColor: 'rgba(124, 58, 237, 0.15)',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.5)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.15)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <Text fw={600} size="lg" c="white" mb="xs">{board.name}</Text>
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
                                variant="light"
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
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
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
                                            {/* Only Admin/Owner can remove. For now assume user can seeing this logic is enough, API protects it too */}
                                            {member.role !== 'Admin' && ( // Prevent removing Admins/Owners for safety in this simple UI
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
                >
                    <Stack>
                        <Autocomplete
                            label="Search User"
                            placeholder="Type username..."
                            data={searchResults.map(u => u.username)}
                            value={searchValue}
                            onChange={setSearchValue}
                            rightSection={searchLoading ? <Loader size="xs" /> : null}
                        />
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleInvite} loading={inviting}>Add</Button>
                        </Group>
                    </Stack>
                </Modal>

                <Modal
                    opened={removeModalOpen}
                    onClose={() => setRemoveModalOpen(false)}
                    title="Remove Member"
                    centered
                >
                    <Text size="sm" mb="lg">
                        Are you sure you want to remove this member from the workspace?
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="subtle" color="gray" onClick={() => setRemoveModalOpen(false)}>
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
