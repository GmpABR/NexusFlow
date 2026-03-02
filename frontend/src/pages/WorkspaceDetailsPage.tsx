import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
    TextInput,
    Select,
    useComputedColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLayoutBoard, IconUsers, IconPlus, IconArrowLeft, IconCheck, IconPalette, IconChartBar, IconSettings, IconLock, IconTrash, IconLink, IconCopy, IconLogout, IconDotsVertical } from '@tabler/icons-react';
import WorkspaceOverview from '../components/WorkspaceOverview';
import { useDebouncedValue, useClipboard } from '@mantine/hooks';
import { getWorkspace, getWorkspaceBoards, addWorkspaceMember, removeWorkspaceMember, createWorkspaceInvite, updateWorkspaceMemberRole, deleteWorkspace, type Workspace } from '../api/workspaces';
import { updateBoard, closeBoard, deleteBoard, type BoardSummary } from '../api/boards';
import { searchUsers, type UserSummary } from '../api/users';
import { BOARD_THEMES, type ThemeColor } from '../constants/themes';

export default function WorkspaceDetailsPage() {
    const computedColorScheme = useComputedColorScheme('dark');
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'boards';

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
    const [inviteRole, setInviteRole] = useState<string>('Member');

    // Remove Member State
    const [removeModalOpen, setRemoveModalOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<number | null>(null);
    const [removing, setRemoving] = useState(false);

    // Board Action State
    const [closeBoardTarget, setCloseBoardTarget] = useState<number | null>(null);
    const [deleteBoardTarget, setDeleteBoardTarget] = useState<number | null>(null);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [generatingLink, setGeneratingLink] = useState(false);
    const clipboard = useClipboard({ timeout: 2000 });
    const currentUserStr = localStorage.getItem('user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

    // Leave/Delete Workspace State
    const [leaveWorkspaceModalOpen, setLeaveWorkspaceModalOpen] = useState(false);
    const [deleteWorkspaceModalOpen, setDeleteWorkspaceModalOpen] = useState(false);
    const [leavingWorkspace, setLeavingWorkspace] = useState(false);
    const [deletingWorkspace, setDeletingWorkspace] = useState(false);

    const isWorkspaceOwner = workspace?.ownerId === currentUser?.id;
    const isWorkspaceAdmin = isWorkspaceOwner ||
        workspace?.members.some(m => m.userId === currentUser?.id && m.role === 'Admin');

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
            const currentUserStr = localStorage.getItem('user');
            const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

            const filteredResults = results.filter(u =>
                u.id !== currentUser?.id &&
                u.id !== workspace?.ownerId &&
                !workspace?.members.some(m => m.userId === u.id)
            );
            setSearchResults(filteredResults);
        } catch (error) {
            console.error("Remove failed", error);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRoleChange = async (userId: number, newRole: string) => {
        if (!workspace) return;
        try {
            await updateWorkspaceMemberRole(workspace.id, userId, newRole);
            setWorkspace({
                ...workspace,
                members: workspace.members.map(m => m.userId === userId ? { ...m, role: newRole as any } : m)
            });
            notifications.show({
                title: 'Success',
                message: 'Member role updated',
                color: 'green'
            });
        } catch (error) {
            console.error("Role update failed", error);
            notifications.show({
                title: 'Error',
                message: 'Failed to update member role',
                color: 'red'
            });
        }
    };

    const handleInvite = async () => {
        if (!searchValue || !workspace) return;
        setInviting(true);
        try {
            await addWorkspaceMember(workspace.id, searchValue, inviteRole);
            notifications.show({
                title: 'Invitation Sent',
                message: `An invitation has been sent/updated for ${searchValue} as ${inviteRole}.`,
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

    const handleCloseBoard = async () => {
        if (!closeBoardTarget) return;
        try {
            await closeBoard(closeBoardTarget);
            notifications.show({ title: 'Success', message: 'Board closed successfully.', color: 'green' });
            setCloseBoardTarget(null);
            if (id) fetchWorkspace(parseInt(id));
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
            if (id) fetchWorkspace(parseInt(id));
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to delete board.', color: 'red' });
        };
    };
    const handleGenerateInviteLink = async () => {
        if (!workspace) return;
        setGeneratingLink(true);
        try {
            const invite = await createWorkspaceInvite(workspace.id, 'Member');
            const url = `${window.location.origin}/join/workspace/${invite.token}`;
            setInviteLink(url);
            notifications.show({
                title: 'Link Generated',
                message: 'Invite link created successfully.',
                color: 'violet'
            });
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to generate invite link.', color: 'red' });
        } finally {
            setGeneratingLink(false);
        }
    };

    const handleLeaveWorkspace = async () => {
        if (!workspace || !currentUser?.id) return;
        setLeavingWorkspace(true);
        try {
            await removeWorkspaceMember(workspace.id, currentUser.id);
            notifications.show({ title: 'Left Workspace', message: 'You have left this workspace.', color: 'blue' });
            setLeaveWorkspaceModalOpen(false);
            navigate('/boards');
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.response?.data?.message || 'Failed to leave workspace.', color: 'red' });
        } finally {
            setLeavingWorkspace(false);
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!workspace) return;
        setDeletingWorkspace(true);
        try {
            await deleteWorkspace(workspace.id);
            notifications.show({ title: 'Workspace Deleted', message: 'Your workspace has been deleted.', color: 'blue' });
            setDeleteWorkspaceModalOpen(false);
            navigate('/boards');
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.response?.data?.message || 'Failed to delete workspace.', color: 'red' });
        } finally {
            setDeletingWorkspace(false);
        }
    };

    if (loading) return <Center h="100%"><Loader color="violet" /></Center>;
    if (!workspace) return null;

    return (
        <Box style={{ minHeight: '100%' }}>
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

                <Group justify="space-between" align="flex-start" mb="xl">
                    <div>
                        <Title c={computedColorScheme === 'dark' ? 'white' : 'black'}>{workspace.name}</Title>
                        <Text c="dimmed">{workspace.description}</Text>
                    </div>
                    <Menu shadow="md" width={200} position="bottom-end">
                        <Menu.Target>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                radius="md"
                                style={{
                                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
                                }}
                            >
                                <IconDotsVertical size={18} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {!isWorkspaceOwner && (
                                <Menu.Item
                                    color="red"
                                    leftSection={<IconLogout size={14} />}
                                    onClick={() => setLeaveWorkspaceModalOpen(true)}
                                >
                                    Leave Workspace
                                </Menu.Item>
                            )}
                            {isWorkspaceOwner && (
                                <Menu.Item
                                    color="red"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => setDeleteWorkspaceModalOpen(true)}
                                >
                                    Delete Workspace
                                </Menu.Item>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                </Group>

                <Tabs
                    value={activeTab}
                    onChange={(val) => setSearchParams({ tab: val || 'boards' })}
                    variant="pills"
                    radius="md"
                    color="violet"
                >
                    <Tabs.List mb="lg" style={{
                        background: computedColorScheme === 'dark' ? '#25262b' : 'white',
                        padding: 4,
                        borderRadius: 8,
                        border: `1px solid ${computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'}`,
                        boxShadow: computedColorScheme === 'light' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                    }}>
                        <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>Overview</Tabs.Tab>
                        <Tabs.Tab value="boards" leftSection={<IconLayoutBoard size={16} />}>Boards</Tabs.Tab>
                        <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>Members</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="overview">
                        {workspace && <WorkspaceOverview workspaceId={workspace.id} />}
                    </Tabs.Panel>

                    <Tabs.Panel value="boards">
                        {boards.length === 0 ? (
                            <Text c="dimmed" ta="center" py="xl">No boards in this workspace yet.</Text>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                                {boards.filter(b => !b.isClosed).map((board) => (
                                    <Card
                                        key={board.id}
                                        shadow="sm"
                                        padding="lg"
                                        radius="md"
                                        withBorder
                                        onClick={() => navigate(`/boards/${board.id}`)}
                                        style={{
                                            cursor: 'pointer',
                                            background: computedColorScheme === 'dark' ? '#25262b' : 'white',
                                            borderColor: computedColorScheme === 'dark' ? '#373A40' : '#dee2e6',
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
                                            <Text fw={600} size="lg" c={computedColorScheme === 'dark' ? 'white' : 'black'} style={{ flex: 1 }}>{board.name}</Text>

                                            {/* Settings Menu - stopPropagation to prevent navigation */}
                                            {isWorkspaceAdmin && (
                                                <Group gap={8}>
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

                                                    <Menu shadow="md" width={200} position="bottom-end">
                                                        <Menu.Target>
                                                            <ActionIcon
                                                                variant="subtle"
                                                                color="gray"
                                                                size="sm"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
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
                                            )}
                                        </Group>

                                        <Group justify="space-between" align="center">
                                            <Text size="xs" c="dimmed">
                                                Created {new Date(board.createdAt).toLocaleDateString()}
                                            </Text>
                                            {board.isClosed && <Badge size="xs" color="red" variant="light">Closed</Badge>}
                                        </Group>
                                    </Card>
                                ))}
                            </SimpleGrid>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="members">
                        <Group justify="space-between" mb="md">
                            <Title order={4} c={computedColorScheme === 'dark' ? 'white' : 'black'}>Workspace Members</Title>
                            {isWorkspaceAdmin && (
                                <Button
                                    leftSection={<IconPlus size={16} />}
                                    color="violet"
                                    onClick={() => setInviteModalOpen(true)}
                                >
                                    Add Member
                                </Button>
                            )}
                        </Group>

                        <Paper
                            p="md"
                            mb="xl"
                            radius="md"
                            withBorder
                            style={{
                                background: computedColorScheme === 'dark' ? 'rgba(124, 58, 237, 0.05)' : '#f3f0ff',
                                borderColor: 'rgba(124, 58, 237, 0.2)'
                            }}
                        >
                            <Stack gap="sm">
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <ThemeIcon color="violet" variant="light" radius="md">
                                            <IconLink size={18} />
                                        </ThemeIcon>
                                        <div>
                                            <Text fw={600} size="sm">Invite via link</Text>
                                            <Text size="xs" c="dimmed">Anyone with the link can join as a member</Text>
                                        </div>
                                    </Group>
                                    {!inviteLink ? (
                                        isWorkspaceAdmin && (
                                            <Button
                                                variant="light"
                                                color="violet"
                                                size="xs"
                                                onClick={handleGenerateInviteLink}
                                                loading={generatingLink}
                                            >
                                                Create Link
                                            </Button>
                                        )
                                    ) : (
                                        <Button
                                            variant="light"
                                            color="gray"
                                            size="xs"
                                            onClick={() => setInviteLink(null)}
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </Group>

                                {inviteLink && isWorkspaceAdmin && (
                                    <Group gap="xs">
                                        <TextInput
                                            variant="filled"
                                            value={inviteLink}
                                            readOnly
                                            style={{ flex: 1 }}
                                            styles={{ input: { fontSize: '12px' } }}
                                        />
                                        <Button
                                            color={clipboard.copied ? 'teal' : 'violet'}
                                            variant="light"
                                            onClick={() => clipboard.copy(inviteLink)}
                                            leftSection={clipboard.copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                        >
                                            {clipboard.copied ? 'Copied' : 'Copy'}
                                        </Button>
                                    </Group>
                                )}
                            </Stack>
                        </Paper>
                        <Stack>
                            {[
                                {
                                    userId: workspace.ownerId,
                                    username: workspace.ownerName,
                                    role: 'Owner',
                                    status: 'Active'
                                },
                                ...workspace.members.filter(m => m.userId !== workspace.ownerId)
                            ].map((member) => (
                                <Paper
                                    key={member.userId}
                                    p="md"
                                    radius="md"
                                    shadow="sm"
                                    withBorder
                                    style={{
                                        background: computedColorScheme === 'dark' ? '#25262b' : 'white',
                                        borderColor: computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'
                                    }}
                                >
                                    <Group justify="space-between">
                                        <Group>
                                            <Avatar color="violet" radius="xl" size="md">{member.username.slice(0, 2).toUpperCase()}</Avatar>
                                            <div>
                                                <Text c={computedColorScheme === 'dark' ? 'white' : 'black'} fw={500} size="sm">{member.username}</Text>
                                                <Text c="dimmed" size="xs" tt="capitalize">{member.role}</Text>
                                            </div>
                                        </Group>
                                        <Group gap="xs">
                                            {member.status === 'Pending' ? (
                                                <Badge color="yellow" variant="light">Pending</Badge>
                                            ) : (
                                                <>
                                                    {(isWorkspaceOwner && member.role !== 'Owner') || (isWorkspaceAdmin && !isWorkspaceOwner && member.role !== 'Owner' && member.role !== 'Admin') ? (
                                                        <Select
                                                            size="xs"
                                                            w={100}
                                                            data={isWorkspaceOwner ? [
                                                                { value: 'Admin', label: 'Admin' },
                                                                { value: 'Member', label: 'Member' },
                                                                { value: 'Viewer', label: 'Viewer' }
                                                            ] : [
                                                                { value: 'Member', label: 'Member' },
                                                                { value: 'Viewer', label: 'Viewer' }
                                                            ]}
                                                            value={member.role}
                                                            onChange={(val) => val && handleRoleChange(member.userId, val)}
                                                        />
                                                    ) : (isWorkspaceAdmin && !isWorkspaceOwner && member.role === 'Admin' && member.userId !== currentUser?.id) ? (
                                                        // Admin can demote other admins to Member/Viewer
                                                        <Select
                                                            size="xs"
                                                            w={100}
                                                            data={[
                                                                { value: 'Admin', label: 'Admin' },
                                                                { value: 'Member', label: 'Member' },
                                                                { value: 'Viewer', label: 'Viewer' }
                                                            ]}
                                                            value={member.role}
                                                            onChange={(val) => val && handleRoleChange(member.userId, val)}
                                                        />
                                                    ) : (
                                                        <Badge color={member.role === 'Admin' || member.role === 'Owner' ? 'violet' : 'gray'}>{member.role}</Badge>
                                                    )}
                                                </>
                                            )}
                                            {isWorkspaceAdmin && member.role !== 'Owner' && member.userId !== currentUser?.id && (
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
                    centered
                    zIndex={10000}
                    styles={{
                        content: { background: computedColorScheme === 'dark' ? '#25262b' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                        header: { background: computedColorScheme === 'dark' ? '#25262b' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                    }}
                >
                    <Stack>
                        <Autocomplete
                            label="Username"
                            placeholder="Type username..."
                            data={searchResults.map(u => u.username)}
                            value={searchValue}
                            onChange={setSearchValue}
                            rightSection={searchLoading ? <Loader size="xs" /> : null}
                            mb="md"
                            comboboxProps={{ zIndex: 10005 }}
                        />
                        <Select
                            label="Role"
                            data={[
                                { value: 'Admin', label: 'Admin' },
                                { value: 'Member', label: 'Member' },
                                { value: 'Viewer', label: 'Viewer' }
                            ]}
                            value={inviteRole}
                            onChange={(val: string | null) => setInviteRole(val || 'Member')}
                            mb="md"
                            comboboxProps={{ zIndex: 10005 }}
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
                        content: { background: computedColorScheme === 'dark' ? '#25262b' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                        header: { background: computedColorScheme === 'dark' ? '#25262b' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
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

                {/* Leave Workspace Confirmation Modal */}
                <Modal
                    opened={leaveWorkspaceModalOpen}
                    onClose={() => setLeaveWorkspaceModalOpen(false)}
                    title="Leave Workspace"
                    centered
                    styles={{
                        content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                        header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                    }}
                >
                    <Stack>
                        <Text size="sm">
                            Are you sure you want to leave this workspace? You will lose access to all boards in this workspace.
                        </Text>
                        <Group justify="flex-end">
                            <Button variant="subtle" color="gray" onClick={() => setLeaveWorkspaceModalOpen(false)}>Cancel</Button>
                            <Button color="red" loading={leavingWorkspace} onClick={handleLeaveWorkspace}>Leave Workspace</Button>
                        </Group>
                    </Stack>
                </Modal>

                {/* Delete Workspace Confirmation Modal */}
                <Modal
                    opened={deleteWorkspaceModalOpen}
                    onClose={() => setDeleteWorkspaceModalOpen(false)}
                    title="Delete Workspace"
                    centered
                    styles={{
                        content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                        header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                    }}
                >
                    <Stack>
                        <Text size="sm">
                            Are you sure you want to permanently delete this workspace? <b>All boards and tasks will be deleted. This action cannot be undone.</b>
                        </Text>
                        <Group justify="flex-end">
                            <Button variant="subtle" color="gray" onClick={() => setDeleteWorkspaceModalOpen(false)}>Cancel</Button>
                            <Button color="red" loading={deletingWorkspace} onClick={handleDeleteWorkspace}>Delete Workspace</Button>
                        </Group>
                    </Stack>
                </Modal>
            </Container>
        </Box >
    );
}
