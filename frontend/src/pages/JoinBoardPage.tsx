import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Center,
    Container,
    Loader,
    Paper,
    Stack,
    Text,
    Title,
    ThemeIcon,
    Group,
    Badge
} from '@mantine/core';
import { IconUsers, IconUserPlus, IconExternalLink, IconLock, IconEye } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getBoardInvite, joinBoard, type BoardInvite } from '../api/boards';

export default function JoinBoardPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [invite, setInvite] = useState<BoardInvite | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!token) return;

        const fetchInvite = async () => {
            try {
                const data = await getBoardInvite(token);
                setInvite(data);
            } catch (error) {
                notifications.show({
                    title: 'Invalid Link',
                    message: 'This invite link is invalid or has expired.',
                    color: 'red'
                });
                navigate('/boards');
            } finally {
                setLoading(false);
            }
        };

        fetchInvite();
    }, [token, navigate]);

    const handleJoin = async () => {
        if (!token) return;

        const authToken = localStorage.getItem('token');
        if (!authToken) {
            notifications.show({
                title: 'Login Required',
                message: 'Please login to join this board.',
                color: 'blue'
            });
            // Save token to return after login
            localStorage.setItem('redirectAfterLogin', `/join/${token}`);
            navigate('/login');
            return;
        }

        setJoining(true);
        try {
            await joinBoard(token);
            notifications.show({
                title: 'Success!',
                message: `You have successfully joined ${invite?.boardName}.`,
                color: 'green'
            });
            if (invite?.boardId) {
                navigate(`/boards/${invite.boardId}`);
            } else {
                navigate('/boards');
            }
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to join the board. You might already be a member.',
                color: 'red'
            });
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <Center style={{ height: '100vh', background: '#0a0a0b' }}>
                <Loader color="violet" size="xl" type="bars" />
            </Center>
        );
    }

    if (!invite) return null;

    return (
        <Box
            style={{
                height: '100vh',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background Decorative Blobs */}
            <Box
                style={{
                    position: 'absolute',
                    width: '40vw',
                    height: '40vw',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)',
                    top: '-10%',
                    right: '-5%',
                    filter: 'blur(60px)',
                    zIndex: 0
                }}
            />
            <Box
                style={{
                    position: 'absolute',
                    width: '35vw',
                    height: '35vw',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
                    bottom: '-10%',
                    left: '-5%',
                    filter: 'blur(60px)',
                    zIndex: 0
                }}
            />

            <Container size="xs" style={{ zIndex: 1 }}>
                <Paper
                    radius="xl"
                    p={40}
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <Stack align="center" gap="xl">
                        <ThemeIcon
                            size={80}
                            radius={100}
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'cyan' }}
                            style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)' }}
                        >
                            <IconUsers size={40} />
                        </ThemeIcon>

                        <Stack align="center" gap={4}>
                            <Title order={2} c="white" fw={800} style={{ textAlign: 'center' }}>
                                You've been invited!
                            </Title>
                            <Text c="dimmed" size="sm" fw={500}>
                                to join the board
                            </Text>
                            <Title order={1} c="violet.4" fw={900} style={{ textShadow: '0 0 20px rgba(167, 139, 250, 0.3)' }}>
                                {invite.boardName}
                            </Title>
                        </Stack>

                        <Group justify="center" gap="md">
                            <Badge
                                size="lg"
                                radius="sm"
                                variant="filled"
                                color={invite.role === 'Member' ? 'blue' : 'gray'}
                                leftSection={invite.role === 'Member' ? <IconUserPlus size={14} /> : <IconEye size={14} />}
                                styles={{ root: { textTransform: 'none', height: 32, padding: '0 15px' } }}
                            >
                                Role: {invite.role}
                            </Badge>
                            <Badge
                                size="lg"
                                radius="sm"
                                variant="outline"
                                color="teal"
                                styles={{ root: { textTransform: 'none', height: 32, padding: '0 15px', color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.2)' } }}
                            >
                                Status: Active Link
                            </Badge>
                        </Group>

                        <Box w="100%" mt="xl">
                            <Button
                                fullWidth
                                size="lg"
                                radius="md"
                                variant="gradient"
                                gradient={{ from: 'violet.6', to: 'indigo.6' }}
                                leftSection={<IconExternalLink size={20} />}
                                loading={joining}
                                onClick={handleJoin}
                                styles={{
                                    root: {
                                        height: 54,
                                        fontSize: 18,
                                        fontWeight: 700,
                                        transition: 'transform 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)'
                                        }
                                    }
                                }}
                            >
                                Join this Board
                            </Button>

                            <Button
                                fullWidth
                                variant="subtle"
                                color="gray"
                                mt="md"
                                size="sm"
                                onClick={() => navigate('/boards')}
                                styles={{ root: { color: 'rgba(255, 255, 255, 0.4)' } }}
                            >
                                Decline or go back
                            </Button>
                        </Box>

                        <Group gap={8} opacity={0.4}>
                            <IconLock size={12} color="white" />
                            <Text size="xs" c="white" fw={500}>
                                Secure invite link generated by NexusFlow
                            </Text>
                        </Group>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
