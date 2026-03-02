
import { Table, Paper, Text, Badge, ScrollArea, useComputedColorScheme } from '@mantine/core';
import { type BoardDetail } from '../api/boards';

interface BoardTableViewProps {
    board: BoardDetail;
}

export default function BoardTableView({ board }: BoardTableViewProps) {
    const computedColorScheme = useComputedColorScheme('dark');
    if (!board || !board.columns) return null;
    const allTasks = board.columns.flatMap(col => col.taskCards.map(task => ({
        ...task,
        columnName: col.name
    })));

    return (
        <Paper
            p="md"
            radius="lg"
            style={{
                background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.75)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: computedColorScheme === 'light' ? '0 8px 32px rgba(0,0,0,0.05)' : 'none'
            }}
        >
            <ScrollArea scrollbars="y" style={{ flex: 1 }}>
                <Table variant="simple" verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th style={{ color: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>Title</Table.Th>
                            <Table.Th style={{ color: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>Status</Table.Th>
                            <Table.Th style={{ color: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>Priority</Table.Th>
                            <Table.Th style={{ color: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>Assignee</Table.Th>
                            <Table.Th style={{ color: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>Points</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {allTasks.map((task) => (
                            <Table.Tr key={task.id} style={{ borderBottom: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                                <Table.Td>
                                    <Text size="sm" fw={500} c={computedColorScheme === 'dark' ? 'white' : 'black'}>{task.title}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Badge variant="light" color="blue" size="xs">{task.columnName}</Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Badge
                                        variant="filled"
                                        color={task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'orange' : 'gray'}
                                        size="xs"
                                    >
                                        {task.priority}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs" c="dimmed">{task.assigneeName || 'Unassigned'}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs" c="dimmed">{task.storyPoints || '-'}</Text>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {allTasks.length === 0 && (
                            <Table.Tr>
                                <Table.Td colSpan={5}>
                                    <Text ta="center" py="xl" c="dimmed">No tasks found on this board.</Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
        </Paper>
    );
}
