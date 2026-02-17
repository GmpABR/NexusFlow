import { Paper, Text, Group, ActionIcon, Badge, Avatar, Tooltip } from '@mantine/core';
import { IconTrash, IconCalendar, IconGripVertical } from '@tabler/icons-react';
import { Draggable } from '@hello-pangea/dnd';
import type { TaskCard as TaskCardType } from '../api/boards';

interface Props {
    task: TaskCardType;
    index: number;
    onDelete: (taskId: number) => void;
    onClick: (task: TaskCardType) => void;
}

const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
        case 'Urgent': return 'red';
        case 'High': return 'orange';
        case 'Medium': return 'yellow';
        default: return 'blue'; // Low
    }
};

export default function TaskCard({ task, index, onDelete, onClick }: Props) {
    return (
        <Draggable draggableId={`task-${task.id}`} index={index}>
            {(provided, snapshot) => (
                <Paper
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    shadow={snapshot.isDragging ? 'xl' : 'sm'}
                    p="sm"
                    radius="md"
                    mb="xs"
                    onClick={() => onClick(task)}
                    style={{
                        ...provided.draggableProps.style,
                        background: snapshot.isDragging
                            ? 'rgba(124, 58, 237, 0.2)'
                            : 'rgba(37, 38, 43, 0.8)',
                        // Removed backdropFilter for stability
                        border: '1px solid rgba(55, 58, 64, 0.5)',
                        // Simplify transition to just transform to avoid fighting with dnd
                        transition: snapshot.isDragging ? 'transform 0.05s' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                        pointerEvents: snapshot.isDragging ? 'none' : 'auto',
                    }}
                    className="task-card"
                >
                    <Group justify="space-between" wrap="nowrap" align="flex-start" mb={4}>
                        <Group wrap="nowrap" gap="xs" style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ marginTop: 2 }}>
                                <IconGripVertical size={14} color="#5c5f66" />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text size="sm" fw={600} c="white" style={{ lineHeight: 1.3 }}>
                                    {task.title}
                                </Text>
                            </div>
                        </Group>
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task.id);
                            }}
                            style={{ opacity: 0.6 }}
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Group>

                    {/* Tags & Priority */}
                    <Group gap={6} mb={8} wrap="wrap">
                        {task.priority !== 'Low' && (
                            <Badge size="xs" variant="dot" color={getPriorityColor(task.priority)}>
                                {task.priority}
                            </Badge>
                        )}
                        {task.tags && task.tags.split(',').map(tag => (
                            <Badge key={tag} size="xs" variant="outline" color="gray">
                                {tag}
                            </Badge>
                        ))}
                    </Group>

                    {/* Footer Info: Points, Date, Assignee */}
                    <Group justify="space-between" align="center" mt="xs">
                        <Group gap="xs">
                            {task.storyPoints !== null && task.storyPoints > 0 && (
                                <Badge size="sm" variant="filled" color="dark" radius="sm">
                                    {task.storyPoints} pts
                                </Badge>
                            )}
                            {task.dueDate && (
                                <Group gap={4}>
                                    <IconCalendar size={12} color="#909296" />
                                    <Text size="xs" c="dimmed">
                                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </Text>
                                </Group>
                            )}
                        </Group>

                        {task.assigneeName && (
                            <Tooltip label={`Assigned to ${task.assigneeName}`} withArrow>
                                <Avatar size="xs" radius="xl" color="blue" name={task.assigneeName}>
                                    {task.assigneeName.substring(0, 2).toUpperCase()}
                                </Avatar>
                            </Tooltip>
                        )}
                    </Group>
                </Paper>
            )}
        </Draggable>
    );
}
