
import { Paper, Title, Group, Text, Badge, Box, ScrollArea, SimpleGrid, Card, Divider, Stack, useComputedColorScheme } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { type BoardDetail } from '../api/boards';
import dayjs from 'dayjs';
import { useState } from 'react';

interface BoardCalendarViewProps {
    board: BoardDetail;
    onTaskClick: (task: any) => void;
}

export default function BoardCalendarView({ board, onTaskClick }: BoardCalendarViewProps) {
    const computedColorScheme = useComputedColorScheme('dark');
    if (!board || !board.columns) return null;
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const allTasks = board.columns.flatMap(col => col.taskCards.map(task => ({
        ...task,
        columnName: col.name
    })));

    const tasksForSelectedDate = allTasks.filter(task =>
        task.dueDate && dayjs(task.dueDate).isSame(selectedDate, 'day')
    );

    const hasTasksOnDate = (date: Date) => {
        return allTasks.some(task => task.dueDate && dayjs(task.dueDate).isSame(date, 'day'));
    };

    return (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" style={{ height: '100%' }}>
            {/* Calendar Picker Side */}
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: computedColorScheme === 'light' ? '0 8px 32px rgba(0,0,0,0.05)' : 'none'
                }}
            >
                <Title order={4} c={computedColorScheme === 'dark' ? 'white' : 'black'} mb="md">Calendário de Prazos</Title>
                <DatePicker
                    value={selectedDate}
                    onChange={(val: any) => setSelectedDate(val)}
                    size="md"
                    styles={{
                        calendarHeader: { color: computedColorScheme === 'dark' ? 'white' : 'black' },
                        calendarHeaderControl: { color: computedColorScheme === 'dark' ? 'white' : 'black' },
                        day: { color: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)', fontSize: '1.1rem' },
                        weekday: { color: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
                    }}
                    renderDay={(date: any) => {
                        const d = date instanceof Date ? date : new Date(date);
                        const hasTasks = hasTasksOnDate(d);
                        return (
                            <div style={{ position: 'relative' }}>
                                <div>{d.getDate()}</div>
                                {hasTasks && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 4,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: '#7c3aed',
                                        boxShadow: '0 0 8px #7c3aed'
                                    }} />
                                )}
                            </div>
                        );
                    }}
                />
            </Paper>

            {/* Tasks for Day Side */}
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: computedColorScheme === 'light' ? '0 8px 32px rgba(0,0,0,0.05)' : 'none'
                }}
            >
                <Group justify="space-between" mb="md">
                    <Title order={4} c={computedColorScheme === 'dark' ? 'white' : 'black'}>
                        {selectedDate ? dayjs(selectedDate).format('DD [de] MMMM') : 'Selecione uma data'}
                    </Title>
                    <Badge variant="light" color="violet">{tasksForSelectedDate.length} tarefas</Badge>
                </Group>

                <Divider mb="md" opacity={0.1} />

                <ScrollArea scrollbars="y" style={{ flex: 1 }}>
                    <Stack gap="sm">
                        {tasksForSelectedDate.map(task => (
                            <Card
                                key={task.id}
                                p="sm"
                                radius="md"
                                style={{
                                    background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'white',
                                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                    cursor: 'pointer'
                                }}
                                onClick={() => onTaskClick(task)}
                            >
                                <Group justify="space-between" wrap="nowrap">
                                    <Box style={{ flex: 1 }}>
                                        <Text size="sm" fw={600} c={computedColorScheme === 'dark' ? 'white' : 'black'} lineClamp={1}>{task.title}</Text>
                                        <Text size="xs" c="dimmed">{task.columnName}</Text>
                                    </Box>
                                    <Badge
                                        variant="filled"
                                        color={task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'orange' : 'gray'}
                                        size="xs"
                                    >
                                        {task.priority}
                                    </Badge>
                                </Group>
                            </Card>
                        ))}
                        {tasksForSelectedDate.length === 0 && (
                            <Box py="xl" ta="center">
                                <Text c="dimmed" size="sm">Nenhuma tarefa para este dia.</Text>
                            </Box>
                        )}
                    </Stack>
                </ScrollArea>
            </Paper>
        </SimpleGrid>
    );
}
