import { useEffect, useState } from 'react';
import {
    Container,
    Title,
    Text,
    Grid,
    Card,
    Button,
    Modal,
    TextInput,
    Textarea,
    Group,
    Loader,
    Stack,

    ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconBriefcase, IconLayoutBoard } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { getMyWorkspaces, createWorkspace, type Workspace } from '../api/workspaces';
import { notifications } from '@mantine/notifications';

export default function WorkspaceDashboard() {
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [opened, { open, close }] = useDisclosure(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const loadWorkspaces = async () => {
        try {
            const data = await getMyWorkspaces();
            setWorkspaces(data);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to load workspaces',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) return;

        setCreating(true);
        try {
            await createWorkspace({ name, description });
            notifications.show({
                title: 'Success',
                message: 'Workspace created successfully',
                color: 'green',
            });
            close();
            setName('');
            setDescription('');
            loadWorkspaces();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to create workspace',
                color: 'red',
            });
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
                <Loader size="xl" />
            </div>
        );
    }

    return (
        <Container size="xl" py="xl">
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>Your Workspaces</Title>
                    <Text c="dimmed">Manage your projects and teams</Text>
                </div>
                <Button leftSection={<IconPlus size={18} />} onClick={open}>
                    Create Workspace
                </Button>
            </Group>

            {workspaces.length === 0 ? (
                <Card withBorder padding="xl" radius="md" style={{ textAlign: 'center' }}>
                    <Stack align="center" gap="md">
                        <ThemeIcon size={60} radius="xl" variant="light" color="blue">
                            <IconBriefcase size={32} />
                        </ThemeIcon>
                        <Title order={3}>No workspaces yet</Title>
                        <Text c="dimmed" maw={400}>
                            Create a workspace to start organizing your boards and collaborating with your team.
                        </Text>
                        <Button onClick={open}>Create your first Workspace</Button>
                    </Stack>
                </Card>
            ) : (
                <Grid>
                    {workspaces.map((workspace) => (
                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={workspace.id}>
                            <Card
                                shadow="sm"
                                padding="lg"
                                radius="md"
                                withBorder
                                style={{ cursor: 'pointer', height: '100%' }}
                                onClick={() => navigate(`/workspace/${workspace.id}`)}
                            >
                                <Group justify="space-between" mb="xs">
                                    <Group gap="xs">
                                        <ThemeIcon color="blue" variant="light">
                                            <IconBriefcase size={16} />
                                        </ThemeIcon>
                                        <Text fw={600} size="lg">
                                            {workspace.name}
                                        </Text>
                                    </Group>
                                </Group>

                                <Text size="sm" c="dimmed" mb="md" lineClamp={2} style={{ minHeight: 40 }}>
                                    {workspace.description || 'No description'}
                                </Text>

                                <Group justify="space-between" mt="auto">
                                    <Text size="xs" c="dimmed">
                                        {workspace.members.length} members
                                    </Text>
                                    <Button variant="light" size="xs" rightSection={<IconLayoutBoard size={14} />}>
                                        View Boards
                                    </Button>
                                </Group>
                            </Card>
                        </Grid.Col>
                    ))}
                </Grid>
            )}

            <Modal opened={opened} onClose={close} title="Create Workspace">
                <Stack>
                    <TextInput
                        label="Workspace Name"
                        placeholder="e.g. Acme Corp, Engineering Team"
                        required
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                    />
                    <Textarea
                        label="Description"
                        placeholder="What is this workspace for?"
                        minRows={3}
                        value={description}
                        onChange={(e) => setDescription(e.currentTarget.value)}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={close}>Cancel</Button>
                        <Button onClick={handleCreate} loading={creating}>Create Workspace</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}
