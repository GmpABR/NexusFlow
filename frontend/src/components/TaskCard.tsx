import { memo } from 'react';
import { Paper, Text, Group, ActionIcon, Badge, Avatar, Stack } from '@mantine/core';
import { IconTrash, IconClock, IconStar, IconGripVertical } from '@tabler/icons-react';
import { Draggable } from '@hello-pangea/dnd';
import type { TaskCard as TaskCardType } from '../api/boards';

interface Props {
    task: TaskCardType;
    index: number;
    onDelete: (taskId: number) => void;
    onClick: (task: TaskCardType) => void;
}

const TaskCard = memo(function TaskCard({ task, index, onDelete, onClick }: Props) {
    const priorityColor =
        task.priority === 'High' ? 'red' :
            task.priority === 'Medium' ? 'yellow' :
                'blue';

    return (
        <Draggable draggableId={`task-${task.id}`} index={index}>
            {(provided, snapshot) => (
                <Paper
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="nexus-card"
                    p="xs"
                    radius="md"
                    mb="xs"
                    onClick={() => onClick(task)}
                    style={{
                        ...provided.draggableProps.style,
                        cursor: 'pointer',
                        transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                >
                    <Stack gap={8}>
                        {/* Row 1: Handle, Title and Assignee */}
                        <Group justify="space-between" align="center" wrap="nowrap">
                            <Group gap={8} style={{ flex: 1, minWidth: 0 }}>
                                <IconGripVertical size={14} color="rgba(255,255,255,0.2)" />
                                <Text size="sm" fw={700} c="white" truncate style={{ flex: 1 }}>
                                    {task.title}
                                </Text>
                            </Group>
                            {task.assigneeName && (
                                <Avatar size={20} radius="xl" color="indigo" styles={{ root: { border: '1px solid rgba(255,255,255,0.1)' } }}>
                                    {task.assigneeName.slice(0, 2).toUpperCase()}
                                </Avatar>
                            )}
                        </Group>

                        {/* Row 2: Metadata */}
                        <Group justify="space-between" align="center">
                            <Group gap={12}>
                                <Badge
                                    size="xs"
                                    radius="sm"
                                    variant="outline"
                                    color={priorityColor}
                                    styles={{ root: { borderWidth: 1, height: 16 }, label: { fontSize: 9, fontWeight: 800 } }}
                                >
                                    {task.priority.toUpperCase()}
                                </Badge>

                                {task.storyPoints !== null && task.storyPoints > 0 && (
                                    <Group gap={4} c="dimmed">
                                        <IconStar size={12} color="#fbbf24" />
                                        <Text size="xs" fw={700} c="white" opacity={0.6}>{task.storyPoints}</Text>
                                    </Group>
                                )}

                                {task.dueDate && (
                                    <Group gap={4} c="dimmed">
                                        <IconClock size={12} />
                                        <Text size="xs" fw={500}>{new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Text>
                                    </Group>
                                )}
                            </Group>

                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="xs"
                                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                styles={{ root: { opacity: 0, transition: 'opacity 0.2s ease' } }}
                                className="delete-btn"
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Group>
                    </Stack>
                </Paper>
            )}
        </Draggable>
    );
});

export default TaskCard;
