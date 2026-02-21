import { useEffect, useState } from 'react';
import {
    Grid, Paper, Text, Group, Stack, RingProgress, SimpleGrid,
    ThemeIcon, List, Badge, ScrollArea, Loader, Center
} from '@mantine/core';
import {
    IconLayoutBoard, IconUsers, IconListCheck, IconAlertCircle,
    IconCalendar, IconUser, IconActivity
} from '@tabler/icons-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { getWorkspaceAnalytics, type WorkspaceAnalytics } from '../api/analytics';
import { formatDistanceToNow } from 'date-fns';

interface WorkspaceOverviewProps {
    workspaceId: number;
}

export default function WorkspaceOverview({ workspaceId }: WorkspaceOverviewProps) {
    const [data, setData] = useState<WorkspaceAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getWorkspaceAnalytics(workspaceId)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [workspaceId]);

    if (loading) return <Center h={400}><Loader color="violet" /></Center>;
    if (!data) return <Text c="dimmed">Failed to load analytics.</Text>;

    const priorityColors: Record<string, string> = {
        'Urgent': '#f87171',
        'High': '#fb923c',
        'Medium': '#fbbf24',
        'Low': '#60a5fa'
    };

    const priorityData = Object.entries(data.tasksByPriority).map(([name, value]) => ({
        name,
        value,
        color: priorityColors[name] || '#94a3b8'
    }));

    const completionRate = data.totalTasks > 0
        ? Math.round((data.completedTasks / data.totalTasks) * 100)
        : 0;

    return (
        <Stack gap="xl">
            {/* Quick Stats */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
                <StatCard
                    title="Total Boards"
                    value={data.totalBoards}
                    icon={<IconLayoutBoard size={24} />}
                    color="blue"
                />
                <StatCard
                    title="Team Members"
                    value={data.totalMembers}
                    icon={<IconUsers size={24} />}
                    color="cyan"
                />
                <StatCard
                    title="Active Tasks"
                    value={data.pendingTasks}
                    icon={<IconListCheck size={24} />}
                    color="violet"
                />
                <StatCard
                    title="Overdue"
                    value={data.overdueTasks}
                    icon={<IconAlertCircle size={24} />}
                    color="red"
                    highlight={data.overdueTasks > 0}
                />
            </SimpleGrid>

            <Grid gutter="xl">
                {/* Completion Progress & Priority Distribution */}
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Stack gap="lg">
                        <Paper p="xl" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <Group justify="space-between">
                                <Stack gap={0}>
                                    <Text size="sm" c="dimmed" fw={600} tt="uppercase">Overall Progress</Text>
                                    <Text fz={32} fw={800} c="white">{completionRate}%</Text>
                                    <Text size="xs" c="dimmed">{data.completedTasks} / {data.totalTasks} tasks completed</Text>
                                </Stack>
                                <RingProgress
                                    size={120}
                                    thickness={12}
                                    roundCaps
                                    sections={[{ value: completionRate, color: 'violet' }]}
                                    label={
                                        <Center>
                                            <IconListCheck size={24} color="gray" />
                                        </Center>
                                    }
                                />
                            </Group>
                        </Paper>

                        <Paper p="xl" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <Text size="sm" c="dimmed" fw={600} tt="uppercase" mb="lg">Tasks by Priority</Text>
                            <div style={{ height: 200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={priorityData} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} style={{ fontSize: 12, fill: '#94a3b8' }} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1a1b1e', border: '1px solid #373a40', borderRadius: 8 }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                            {priorityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Paper>
                    </Stack>
                </Grid.Col>

                {/* Recent Activity */}
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Paper p="xl" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.03)', height: '100%' }}>
                        <Group mb="lg">
                            <ThemeIcon variant="light" color="violet">
                                <IconActivity size={18} />
                            </ThemeIcon>
                            <Text fw={700}>Recent Activity</Text>
                        </Group>

                        <ScrollArea h={400}>
                            {data.recentActivity.length === 0 ? (
                                <Text c="dimmed" ta="center" py="xl">No recent activity found.</Text>
                            ) : (
                                <List spacing="sm" size="sm" center icon={null} styles={{ item: { color: '#94a3b8' } }}>
                                    {data.recentActivity.map((act, i) => (
                                        <List.Item key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
                                            <Group gap="xs" align="flex-start" wrap="nowrap">
                                                <Avatar size="sm" radius="xl" color="violet" variant="light">
                                                    {act.username.slice(0, 2).toUpperCase()}
                                                </Avatar>
                                                <Stack gap={2}>
                                                    <Text size="sm" c="white">
                                                        <Text span fw={700}>{act.username}</Text> {act.action} <Text span fw={600} c="violet.3">{act.taskTitle}</Text>
                                                    </Text>
                                                    <Group gap={8}>
                                                        <Badge size="xs" variant="outline" color="gray">{act.boardName}</Badge>
                                                        <Text size="xs" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <IconCalendar size={10} />
                                                            {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                                                        </Text>
                                                    </Group>
                                                </Stack>
                                            </Group>
                                        </List.Item>
                                    ))}
                                </List>
                            )}
                        </ScrollArea>
                    </Paper>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}

function StatCard({ title, value, icon, color, highlight }: { title: string; value: number; icon: React.ReactNode; color: string; highlight?: boolean }) {
    return (
        <Paper p="lg" radius="md" withBorder style={{
            background: 'rgba(255,255,255,0.03)',
            borderLeft: `4px solid ${highlight ? '#f87171' : 'transparent'}`
        }}>
            <Group justify="space-between">
                <div>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" lts={1}>{title}</Text>
                    <Text fz={28} fw={800} c="white">{value}</Text>
                </div>
                <ThemeIcon size={48} radius="md" variant="light" color={color}>
                    {icon}
                </ThemeIcon>
            </Group>
        </Paper>
    );
}

function Avatar({ children, size, radius, color, variant }: any) {
    // Simpler avatar since I don't want to rely on the main Avatar component if it causes issues, 
    // but Mantine's Avatar should be fine.
    return (
        <Center style={{
            width: size === 'sm' ? 32 : 40,
            height: size === 'sm' ? 32 : 40,
            borderRadius: radius === 'xl' ? '50%' : 8,
            background: 'rgba(124, 58, 237, 0.1)',
            color: '#7c6fe0',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0
        }}>
            {children}
        </Center>
    );
}
