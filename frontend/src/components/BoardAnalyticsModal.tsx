import { Modal, Text, Group, Paper, Stack, RingProgress, Badge, useComputedColorScheme } from '@mantine/core';
import { useEffect, useState } from 'react';
import { getBoardAnalytics, type BoardAnalytics } from '../api/analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { IconFlame, IconChartBar, IconCheck, IconClock, IconBolt, IconCalendarStats, IconInfoCircle } from '@tabler/icons-react';
import { Tooltip } from '@mantine/core';

interface BoardAnalyticsModalProps {
    opened: boolean;
    onClose: () => void;
    boardId: number;
}

export default function BoardAnalyticsModal({ opened, onClose, boardId }: BoardAnalyticsModalProps) {
    const [analytics, setAnalytics] = useState<BoardAnalytics | null>(null);
    const computedColorScheme = useComputedColorScheme('dark');

    useEffect(() => {
        if (opened) {
            fetchAnalytics();
        }
    }, [opened, boardId]);

    const fetchAnalytics = async () => {
        try {
            const data = await getBoardAnalytics(boardId);
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        }
    };

    if (!analytics) return null;

    // Convert burnDownData record to array for Recharts
    const burnDownChartData = Object.keys(analytics.burnDownData).map(date => ({
        date,
        remaining: analytics.burnDownData[date]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Convert userTimeData record to array for display
    const userTimeList = Object.keys(analytics.userTimeData)
        .map(username => ({ username, minutes: analytics.userTimeData[username] }))
        .sort((a, b) => b.minutes - a.minutes);

    const completionPercentage = analytics.totalTasks === 0 ? 0 : Math.round((analytics.completedTasks / analytics.totalTasks) * 100);

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Group gap="xs"><IconChartBar size={20} color="#4dabf7" /><Text fw={700} size="lg">Board Analytics</Text></Group>}
            size="xl"
            centered
            zIndex={3000}
            styles={{
                content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black', borderBottom: `1px solid ${computedColorScheme === 'dark' ? '#2C2E33' : '#e9ecef'}` },
                body: { padding: '24px' }
            }}
        >
            <Stack gap="xl">
                {/* Top Metrics Row */}
                <Group grow align="flex-start">
                    <Paper p="md" radius="md" style={{ background: computedColorScheme === 'dark' ? '#25262b' : '#f8f9fa', border: `1px solid ${computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'}` }}>
                        <Group justify="space-between">
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.05em' }}>TOTAL TASKS</Text>
                                <Text size="xl" fw={700}>{analytics.totalTasks}</Text>
                            </Stack>
                            <RingProgress
                                size={80}
                                roundCaps
                                thickness={8}
                                sections={[{ value: completionPercentage, color: 'teal' }]}
                                label={
                                    <Text c="teal" fw={700} ta="center" size="sm">
                                        {completionPercentage}%
                                    </Text>
                                }
                            />
                        </Group>
                    </Paper>

                    <Paper p="md" radius="md" style={{ background: computedColorScheme === 'dark' ? '#25262b' : '#f8f9fa', border: `1px solid ${computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'}` }}>
                        <Group gap="xs" mb="xs">
                            <IconCheck size={16} color="#20c997" />
                            <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.05em' }}>COMPLETED / PENDING</Text>
                        </Group>
                        <Group gap="xl">
                            <Stack gap={0}>
                                <Text size="xl" fw={700} c="teal">{analytics.completedTasks}</Text>
                                <Text size="xs" c="dimmed">Done</Text>
                            </Stack>
                            <div style={{ width: 1, height: 40, background: computedColorScheme === 'dark' ? '#373A40' : '#dee2e6' }}></div>
                            <Stack gap={0}>
                                <Text size="xl" fw={700} c="orange">{analytics.pendingTasks}</Text>
                                <Text size="xs" c="dimmed">To Do</Text>
                            </Stack>
                        </Group>
                    </Paper>

                    <Paper p="md" radius="md" style={{ background: computedColorScheme === 'dark' ? '#25262b' : '#f8f9fa', border: `1px solid ${computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'}` }}>
                        <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                                <IconCalendarStats size={16} color="#4dabf7" />
                                <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.05em' }}>AVG LEAD TIME</Text>
                            </Group>
                            <Tooltip label="Average time from task creation to completion" position="top" withArrow>
                                <IconInfoCircle size={14} color="#909296" style={{ cursor: 'help' }} />
                            </Tooltip>
                        </Group>
                        <Stack gap={0}>
                            <Text size="xl" fw={700}>{analytics.averageLeadTimeDays} <Text component="span" size="sm" fw={400} c="dimmed">days</Text></Text>
                            <Text size="xs" c="dimmed">Creation to Done</Text>
                        </Stack>
                    </Paper>

                    <Paper p="md" radius="md" style={{ background: computedColorScheme === 'dark' ? '#25262b' : '#f8f9fa', border: `1px solid ${computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'}` }}>
                        <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                                <IconBolt size={16} color="#fab005" />
                                <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.05em' }}>AVG CYCLE TIME</Text>
                            </Group>
                            <Tooltip label="Average time from when work actually started (first move) until completion" position="top" withArrow>
                                <IconInfoCircle size={14} color="#909296" style={{ cursor: 'help' }} />
                            </Tooltip>
                        </Group>
                        <Stack gap={0}>
                            <Text size="xl" fw={700}>{analytics.averageCycleTimeDays} <Text component="span" size="sm" fw={400} c="dimmed">days</Text></Text>
                            <Text size="xs" c="dimmed">Start to Done</Text>
                        </Stack>
                    </Paper>
                </Group>

                {/* Burn Down Chart */}
                <Paper p="md" radius="md" style={{ background: computedColorScheme === 'dark' ? '#25262b' : '#f8f9fa', border: `1px solid ${computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'}` }}>
                    <Group justify="space-between" mb="md">
                        <Group gap="xs">
                            <IconFlame size={18} color="#ff922b" />
                            <Text size="sm" fw={700}>Burn-down Chart (Tasks Remaining)</Text>
                        </Group>
                    </Group>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={burnDownChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'} opacity={0.5} />
                                <XAxis dataKey="date" stroke={computedColorScheme === 'dark' ? '#909296' : '#495057'} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={computedColorScheme === 'dark' ? '#909296' : '#495057'} fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip
                                    contentStyle={{ background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', border: `1px solid ${computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'}`, borderRadius: 8, color: computedColorScheme === 'dark' ? 'white' : 'black' }}
                                    itemStyle={{ color: '#ff922b' }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                <Line type="monotone" dataKey="remaining" stroke="#ff922b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Tasks Remaining" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Paper>

                {/* Time Logged by Member */}
                <Paper p="md" radius="md" style={{ background: computedColorScheme === 'dark' ? '#25262b' : '#f8f9fa', border: `1px solid ${computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'}` }}>
                    <Group gap="xs" mb="md">
                        <IconClock size={18} color="#4dabf7" />
                        <Text size="sm" fw={700}>Time Logged by Member</Text>
                    </Group>

                    {userTimeList.length === 0 ? (
                        <Text size="sm" c="dimmed" fs="italic">No time logged yet.</Text>
                    ) : (
                        <Stack gap="sm">
                            {userTimeList.map(user => (
                                <Group key={user.username} justify="space-between" align="center" style={{ borderBottom: `1px solid ${computedColorScheme === 'dark' ? '#2C2E33' : '#f1f3f5'}`, paddingBottom: 8 }}>
                                    <Text size="sm" fw={500}>{user.username}</Text>
                                    <Badge size="lg" variant="light" color="blue">
                                        {Math.floor(user.minutes / 60)}h {user.minutes % 60}m
                                    </Badge>
                                </Group>
                            ))}
                        </Stack>
                    )}
                </Paper>

            </Stack>
        </Modal>
    );
}
