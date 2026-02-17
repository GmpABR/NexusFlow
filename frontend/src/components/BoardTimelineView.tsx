import React from 'react';
import { Paper, Title, Group, Text, Badge, Stack, Box, ScrollArea, ThemeIcon } from '@mantine/core';
import { type BoardDetail } from '../api/boards';
import { IconClock, IconCalendarCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface BoardTimelineViewProps {
    board: BoardDetail;
    onTaskClick: (task: any) => void;
}

export default function BoardTimelineView({ board, onTaskClick }: BoardTimelineViewProps) {
    if (!board || !board.columns) return null;
    const allTasks = board.columns.flatMap(col => col.taskCards.map(task => ({
        ...task,
        columnName: col.name
    })));

    // Sort tasks by due date, nulls at the end
    const sortedTasks = [...allTasks].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix();
    });

    const groupedTasks = [
        { title: 'Atrasadas', color: 'red', tasks: sortedTasks.filter(t => t.dueDate && dayjs(t.dueDate).isBefore(dayjs(), 'day')) },
        { title: 'Hoje', color: 'blue', tasks: sortedTasks.filter(t => t.dueDate && dayjs(t.dueDate).isSame(dayjs(), 'day')) },
        { title: 'Próximas', color: 'teal', tasks: sortedTasks.filter(t => t.dueDate && dayjs(t.dueDate).isAfter(dayjs(), 'day')) },
        { title: 'Sem Data', color: 'gray', tasks: sortedTasks.filter(t => !t.dueDate) },
    ].filter(group => group.tasks.length > 0);

    return (
        <Paper
            p="md"
            radius="lg"
            style={{
                background: 'rgba(20, 21, 23, 0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Group p="md" mb="md">
                <ThemeIcon variant="light" color="violet" size="lg">
                    <IconClock size={20} />
                </ThemeIcon>
                <Title order={4} c="white">Cronograma do Projeto</Title>
            </Group>

            <ScrollArea style={{ flex: 1 }} p="md">
                <Stack gap="xl">
                    {groupedTasks.map(group => (
                        <Box key={group.title}>
                            <Group mb="md" gap="xs">
                                <Text fw={700} size="sm" c={group.color} tt="uppercase" style={{ letterSpacing: 1 }}>{group.title}</Text>
                                <Badge variant="light" color={group.color} size="xs">{group.tasks.length}</Badge>
                            </Group>

                            <Stack gap="xs">
                                {group.tasks.map(task => (
                                    <Paper
                                        key={task.id}
                                        p="md"
                                        radius="md"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            transition: 'transform 0.2s ease, background 0.2s ease',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => onTaskClick(task)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            e.currentTarget.style.transform = 'translateX(4px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                            e.currentTarget.style.transform = 'translateX(0)';
                                        }}
                                    >
                                        <Group justify="space-between" wrap="nowrap">
                                            <Box style={{ flex: 1 }}>
                                                <Text size="sm" fw={600} c="white">{task.title}</Text>
                                                <Group gap={8} mt={4}>
                                                    <Badge size="xs" variant="light" color="blue">{task.columnName}</Badge>
                                                    {task.dueDate && (
                                                        <Group gap={4} opacity={0.6}>
                                                            <IconCalendarCheck size={12} />
                                                            <Text size="xs">{dayjs(task.dueDate).format('DD MMM')}</Text>
                                                        </Group>
                                                    )}
                                                </Group>
                                            </Box>
                                            <Badge
                                                variant="filled"
                                                color={task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'orange' : 'gray'}
                                                size="xs"
                                            >
                                                {task.priority}
                                            </Badge>
                                        </Group>
                                    </Paper>
                                ))}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </ScrollArea>
        </Paper>
    );
}
