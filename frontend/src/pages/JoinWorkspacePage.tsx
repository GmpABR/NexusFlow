import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Title,
    Text,
    Button,
    Stack,
    Center,
    Loader,
    ThemeIcon,
    Badge,
    useComputedColorScheme
} from '@mantine/core';
import { IconUsers, IconBriefcase, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getWorkspaceInvite, joinWorkspaceByToken, type WorkspaceInvite } from '../api/workspaces';

export default function JoinWorkspacePage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
    const [error, setError] = useState<string | null>(null);
    const computedColorScheme = useComputedColorScheme('dark');

    useEffect(() => {
        if (token) {
            fetchInvite();
        }
    }, [token]);

    const fetchInvite = async () => {
        try {
            const data = await getWorkspaceInvite(token!);
            setInvite(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch invite details.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        const userToken = localStorage.getItem('token');
        if (!userToken) {
            // Save token to session/local storage to join after login
            localStorage.setItem('pendingWorkspaceInvite', token!);
            navigate('/register');
            return;
        }

        setJoining(true);
        try {
            await joinWorkspaceByToken(token!);
            notifications.show({
                title: 'Success!',
                message: `You have successfully joined ${invite?.workspaceName}.`,
                color: 'green'
            });
            navigate('/boards');
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to join the workspace.',
                color: 'red'
            });
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <Center style={{ height: '100vh', flexDirection: 'column', gap: 20 }}>
                <Loader color="violet" size="xl" type="bars" />
                <Text fw={500} c="dimmed">Loading invitation...</Text>
            </Center>
        );
    }

    if (error) {
        return (
            <Center style={{ height: '100vh', p: 20 }}>
                <Paper p="xl" radius="md" withBorder style={{ maxWidth: 400, textAlign: 'center' }}>
                    <ThemeIcon size={60} radius="xl" color="red" variant="light" mb="md">
                        <IconUsers size={34} />
                    </ThemeIcon>
                    <Title order={2} mb="xs">Invite Error</Title>
                    <Text c="dimmed" mb="xl">{error}</Text>
                    <Button fullWidth variant="light" color="gray" onClick={() => navigate('/boards')}>
                        Back to Home
                    </Button>
                </Paper>
            </Center>
        );
    }

    return (
        <Box
            style={{
                height: '100vh',
                background: computedColorScheme === 'dark'
                    ? 'radial-gradient(circle at top right, #2c1a4a 0%, #0a0a0b 100%)'
                    : 'radial-gradient(circle at top right, #f3f0ff 0%, #f8f9fa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
            }}
        >
            <Paper
                p={40}
                radius="lg"
                withBorder
                style={{
                    maxWidth: 450,
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)',
                    background: computedColorScheme === 'dark' ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.9)'
                }}
            >
                <ThemeIcon
                    size={80}
                    radius="xl"
                    variant="gradient"
                    gradient={{ from: 'violet', to: 'indigo' }}
                    mb="xl"
                    style={{ margin: '0 auto 24px' }}
                >
                    <IconBriefcase size={40} />
                </ThemeIcon>

                <Title order={1} mb="xs" style={{ fontSize: 28 }}>Join Workspace</Title>
                <Text size="lg" mb="xl" c="dimmed">
                    You've been invited to join <Text span fw={700} c={computedColorScheme === 'dark' ? 'white' : 'dark'}>{invite?.workspaceName}</Text> as a <Badge color="violet" variant="light">{invite?.role}</Badge>.
                </Text>

                <Stack gap="md">
                    <Button
                        size="lg"
                        radius="md"
                        fullWidth
                        variant="gradient"
                        gradient={{ from: 'violet', to: 'indigo' }}
                        onClick={handleJoin}
                        loading={joining}
                        leftSection={<IconCheck size={20} />}
                        style={{ height: 54 }}
                    >
                        Accept Invitation
                    </Button>
                    <Button
                        variant="subtle"
                        color="gray"
                        onClick={() => navigate('/boards')}
                        disabled={joining}
                    >
                        No thanks, take me home
                    </Button>
                </Stack>

                <Text size="xs" c="dimmed" mt="xl">
                    By joining, you will be able to see and collaborate on boards within this workspace.
                </Text>
            </Paper>
        </Box>
    );
}
