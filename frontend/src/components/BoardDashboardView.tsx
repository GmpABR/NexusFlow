import React from 'react';
import { Paper, Title, Group, Text, Box, ScrollArea, SimpleGrid, RingProgress, Stack, ThemeIcon, useComputedColorScheme } from '@mantine/core';
import { type BoardDetail } from '../api/boards';
import { IconChartBar, IconAlertCircle, IconCheck, IconTarget } from '@tabler/icons-react';

interface BoardDashboardViewProps {
    board: BoardDetail;
}

export default function BoardDashboardView({ board }: BoardDashboardViewProps) {
    const computedColorScheme = useComputedColorScheme('dark');
    if (!board || !board.columns) return null;
    const allTasks = board.columns.flatMap(col => col.taskCards);
    const totalTasks = allTasks.length;

    const highPriorityCount = allTasks.filter(t => t.priority === 'High').length;
    const completedTasks = board.columns.find(c => c.name.toLowerCase().includes('done') || c.name.toLowerCase().includes('concluido'))?.taskCards.length || 0;

    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const columnStats = board.columns.map(col => ({
        name: col.name,
        count: col.taskCards.length,
        color: col.name.toLowerCase().includes('done') ? 'teal' : col.name.toLowerCase().includes('doing') ? 'blue' : 'gray'
    }));

    return (
        <ScrollArea h="100%" offsetScrollbars>
            <Stack gap="lg" p="lg">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
                    <StatCard
                        title="Total de Tarefas"
                        value={totalTasks.toString()}
                        icon={<IconChartBar size={24} color="#7c3aed" />}
                    />
                    <StatCard
                        title="Alta Prioridade"
                        value={highPriorityCount.toString()}
                        icon={<IconAlertCircle size={24} color="#ef4444" />}
                    />
                    <StatCard
                        title="Concluídas"
                        value={completedTasks.toString()}
                        icon={<IconCheck size={24} color="#10b981" />}
                    />
                    <Paper
                        p="md"
                        radius="lg"
                        style={{
                            background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(16px)',
                            border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: computedColorScheme === 'light' ? '0 8px 32px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        <Box>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Progresso Geral</Text>
                            <Text size="xl" fw={800} c={computedColorScheme === 'dark' ? 'white' : 'black'}>{Math.round(progress)}%</Text>
                        </Box>
                        <RingProgress
                            size={60}
                            thickness={6}
                            roundCaps
                            sections={[{ value: progress, color: 'violet' }]}
                        />
                    </Paper>
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                    <Paper
                        p="lg"
                        radius="lg"
                        style={{
                            background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(16px)',
                            border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                            boxShadow: computedColorScheme === 'light' ? '0 8px 32px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        <Title order={4} c={computedColorScheme === 'dark' ? 'white' : 'black'} mb="xl">Distribuição por Status</Title>
                        <Stack gap="md">
                            {columnStats.map(stat => (
                                <Box key={stat.name}>
                                    <Group justify="space-between" mb={4}>
                                        <Text size="sm" c={computedColorScheme === 'dark' ? 'white' : 'black'}>{stat.name}</Text>
                                        <Text size="sm" fw={700} c="dimmed">{stat.count}</Text>
                                    </Group>
                                    <Box
                                        style={{
                                            height: 8,
                                            background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                            borderRadius: 4,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <Box
                                            style={{
                                                height: '100%',
                                                width: `${totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0}%`,
                                                background: stat.color === 'teal' ? '#10b981' : stat.color === 'blue' ? '#3b82f6' : '#6b7280'
                                            }}
                                        />
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>

                    <Paper
                        p="lg"
                        radius="lg"
                        style={{
                            background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(16px)',
                            border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            boxShadow: computedColorScheme === 'light' ? '0 8px 32px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        <IconTarget size={64} color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} />
                        <Title order={3} c={computedColorScheme === 'dark' ? 'white' : 'black'} mt="md" fw={800}>Painel Operacional</Title>
                        <Text c="dimmed" size="sm" maw={300} mt="xs">
                            Visualize a saúde do seu projeto em tempo real com métricas detalhadas.
                        </Text>
                    </Paper>
                </SimpleGrid>
            </Stack>
        </ScrollArea>
    );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
    const computedColorScheme = useComputedColorScheme('dark');
    return (
        <Paper
            p="md"
            radius="lg"
            style={{
                background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                boxShadow: computedColorScheme === 'light' ? '0 8px 32px rgba(0,0,0,0.05)' : 'none'
            }}
        >
            <Group justify="space-between">
                <Box>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">{title}</Text>
                    <Text size="xl" fw={800} c={computedColorScheme === 'dark' ? 'white' : 'black'}>{value}</Text>
                </Box>
                <ThemeIcon variant="light" size="xl" radius="md">
                    {icon}
                </ThemeIcon>
            </Group>
        </Paper>
    );
}

