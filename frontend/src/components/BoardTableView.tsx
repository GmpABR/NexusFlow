
import { Table, Paper, Text, Badge, ScrollArea } from '@mantine/core';
import { type BoardDetail } from '../api/boards';

interface BoardTableViewProps {
    board: BoardDetail;
}

export default function BoardTableView({ board }: BoardTableViewProps) {
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
                background: 'rgba(20, 21, 23, 0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            <ScrollArea scrollbars="y" style={{ flex: 1 }}>
                <Table variant="simple" verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th style={{ color: 'rgba(255,255,255,0.6)' }}>Título</Table.Th>
                            <Table.Th style={{ color: 'rgba(255,255,255,0.6)' }}>Status</Table.Th>
                            <Table.Th style={{ color: 'rgba(255,255,255,0.6)' }}>Prioridade</Table.Th>
                            <Table.Th style={{ color: 'rgba(255,255,255,0.6)' }}>Responsável</Table.Th>
                            <Table.Th style={{ color: 'rgba(255,255,255,0.6)' }}>Pontos</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {allTasks.map((task) => (
                            <Table.Tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <Table.Td>
                                    <Text size="sm" fw={500} c="white">{task.title}</Text>
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
