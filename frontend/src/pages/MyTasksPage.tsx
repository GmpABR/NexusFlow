import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Center, Loader, Text, Group, Badge, Stack, Paper,
    Title, Grid, ThemeIcon, Button, Anchor,
} from '@mantine/core';
import {
    IconCalendar, IconStar, IconTag,
    IconLayoutKanban, IconExclamationCircle, IconCircleCheck,
} from '@tabler/icons-react';
import { getMyTasks, type MyTask } from '../api/users';

function getPriorityColor(priority: string) {
    switch (priority) {
        case 'Urgent': return 'red';
        case 'High': return 'orange';
        case 'Medium': return 'yellow';
        default: return 'blue';
    }
}

function isOverdue(dueDate: string | null) {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
}

export default function MyTasksPage() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<MyTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getMyTasks()
            .then(setTasks)
            .catch(() => setError('Failed to load your tasks.'))
            .finally(() => setLoading(false));
    }, []);

    // Group tasks by boardId
    const grouped = tasks.reduce<Record<number, { boardName: string; tasks: MyTask[] }>>((acc, task) => {
        if (!acc[task.boardId]) {
            acc[task.boardId] = { boardName: task.boardName, tasks: [] };
        }
        acc[task.boardId].tasks.push(task);
        return acc;
    }, {});

    if (loading) {
        return (
            <Center style={{ minHeight: '100%', background: 'linear-gradient(135deg, #0d0e11 0%, #121318 100%)' }}>
                <Loader color="violet" size="lg" />
            </Center>
        );
    }

    return (
        <Box
            style={{
                minHeight: '100%',
                background: 'linear-gradient(135deg, #0d0e11 0%, #121318 100%)',
                color: 'white',
            }}
        >
            {/* Header */}
            <Box
                px="xl"
                py="lg"
                style={{
                    background: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Group justify="space-between">
                    <Box>
                        <Title order={3} style={{ color: 'white', fontWeight: 800, letterSpacing: '-0.5px' }}>
                            My Tasks
                        </Title>
                        <Text size="xs" c="dimmed">
                            {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you
                        </Text>
                    </Box>
                    <Badge size="lg" variant="dot" color="violet">
                        {tasks.filter(t => isOverdue(t.dueDate)).length} overdue
                    </Badge>
                </Group>
            </Box>

            {/* Content */}
            <Box p="xl" style={{ maxWidth: 1100, margin: '0 auto' }}>
                {error && (
                    <Center py="xl">
                        <Stack align="center" gap="xs">
                            <IconExclamationCircle size={40} color="#f87171" />
                            <Text c="red">{error}</Text>
                        </Stack>
                    </Center>
                )}

                {!error && tasks.length === 0 && (
                    <Center py={80}>
                        <Stack align="center" gap="md">
                            <ThemeIcon size={72} radius="xl" variant="light" color="violet">
                                <IconCircleCheck size={40} />
                            </ThemeIcon>
                            <Text fw={700} size="xl" c="white">All clear!</Text>
                            <Text c="dimmed" ta="center" maw={400}>
                                No tasks are currently assigned to you. Open a board and assign yourself a task to get started.
                            </Text>
                            <Button color="violet" variant="light" onClick={() => navigate('/boards')}>
                                Go to Boards
                            </Button>
                        </Stack>
                    </Center>
                )}

                <Stack gap="xl">
                    {Object.entries(grouped).map(([boardId, { boardName, tasks: boardTasks }]) => (
                        <Box key={boardId}>
                            {/* Board Group Header */}
                            <Group mb="sm" gap="sm">
                                <ThemeIcon size="sm" radius="xl" color="violet" variant="light">
                                    <IconLayoutKanban size={12} />
                                </ThemeIcon>
                                <Text fw={700} size="sm" c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {boardName}
                                </Text>
                                <Badge size="xs" variant="filled" color="dark" radius="sm"
                                    styles={{ root: { background: 'rgba(255,255,255,0.08)' } }}>
                                    {boardTasks.length}
                                </Badge>
                                <Anchor
                                    size="xs"
                                    c="violet"
                                    onClick={() => navigate(`/boards/${boardId}`)}
                                    style={{ marginLeft: 'auto', cursor: 'pointer' }}
                                >
                                    Open board →
                                </Anchor>
                            </Group>

                            <Grid gutter="sm">
                                {boardTasks.map(task => (
                                    <Grid.Col key={task.id} span={{ base: 12, sm: 6, md: 4 }}>
                                        <Paper
                                            p="md"
                                            radius="lg"
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: `1px solid ${isOverdue(task.dueDate) ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                transition: 'all 0.15s ease',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => navigate(`/boards/${task.boardId}`)}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                                (e.currentTarget as HTMLElement).style.transform = 'none';
                                            }}
                                        >
                                            <Stack gap={10}>
                                                <Group justify="space-between" align="flex-start">
                                                    <Text fw={700} size="sm" c="white" lineClamp={2} style={{ flex: 1 }}>
                                                        {task.title}
                                                    </Text>
                                                    <Badge
                                                        size="xs"
                                                        variant="dot"
                                                        color={getPriorityColor(task.priority)}
                                                    >
                                                        {task.priority}
                                                    </Badge>
                                                </Group>

                                                <Group gap={8}>
                                                    <Badge
                                                        size="xs"
                                                        variant="outline"
                                                        color="gray"
                                                        styles={{ root: { borderColor: 'rgba(255,255,255,0.15)' } }}
                                                    >
                                                        {task.columnName}
                                                    </Badge>

                                                    {task.storyPoints !== null && task.storyPoints > 0 && (
                                                        <Group gap={4}>
                                                            <IconStar size={11} color="#fbbf24" />
                                                            <Text size="xs" c="dimmed">{task.storyPoints} pts</Text>
                                                        </Group>
                                                    )}
                                                </Group>

                                                {task.dueDate && (
                                                    <Group gap={4}>
                                                        <IconCalendar size={12} color={isOverdue(task.dueDate) ? '#f87171' : '#6b7280'} />
                                                        <Text
                                                            size="xs"
                                                            c={isOverdue(task.dueDate) ? 'red' : 'dimmed'}
                                                            fw={isOverdue(task.dueDate) ? 600 : 400}
                                                        >
                                                            {isOverdue(task.dueDate) ? 'Overdue · ' : ''}
                                                            {new Date(task.dueDate).toLocaleDateString('en-GB', {
                                                                day: '2-digit', month: 'short', year: 'numeric'
                                                            })}
                                                        </Text>
                                                    </Group>
                                                )}

                                                {task.tags && (
                                                    <Group gap={4} wrap="wrap">
                                                        <IconTag size={11} color="#6b7280" />
                                                        {task.tags.split(',').map(tag => (
                                                            <Badge
                                                                key={tag}
                                                                size="xs"
                                                                variant="filled"
                                                                radius="sm"
                                                                styles={{ root: { background: 'rgba(139,92,246,0.2)', color: '#a78bfa' } }}
                                                            >
                                                                {tag.trim()}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                )}
                                            </Stack>
                                        </Paper>
                                    </Grid.Col>
                                ))}
                            </Grid>
                        </Box>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}
