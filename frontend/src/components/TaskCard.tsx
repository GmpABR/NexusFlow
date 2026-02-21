import { memo } from 'react';
import { Paper, Text, Group, ActionIcon, Badge, Avatar, Stack, Menu, Tooltip } from '@mantine/core';
import { IconPaperclip } from '@tabler/icons-react';
import { IconCalendar, IconClock, IconStar, IconGripVertical, IconDots, IconTrash } from '@tabler/icons-react';
import { Draggable } from '@hello-pangea/dnd';
import type { TaskCard as TaskCardType } from '../api/boards';

type DueDateStatus = 'overdue' | 'due-soon' | 'upcoming' | null;

function getDueDateStatus(dueDate: string | null | undefined): DueDateStatus {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffMs < 0) return 'overdue';
    if (diffHours <= 24) return 'due-soon';
    return 'upcoming';
}

const STATUS_COLOR: Record<NonNullable<DueDateStatus>, string> = {
    overdue: '#ff6b6b',
    'due-soon': '#fbbf24',
    upcoming: 'rgba(255,255,255,0.35)',
};

const STATUS_LABEL: Record<NonNullable<DueDateStatus>, string> = {
    overdue: 'Overdue',
    'due-soon': 'Due soon',
    upcoming: '',
};

interface Props {
    task: TaskCardType;
    index: number;
    onDelete: (taskId: number) => void;
    onClick: (task: TaskCardType) => void;
}

const TaskCard = memo(function TaskCard({ task, index, onDelete, onClick }: Props) {
    const priorityColor =
        task.priority === 'Urgent' ? 'red' :
            task.priority === 'High' ? 'orange' :
                task.priority === 'Medium' ? 'yellow' :
                    'blue';

    const dueDateStatus = getDueDateStatus(task.dueDate);

    return (
        <Draggable draggableId={`task-${task.id}`} index={index}>
            {(provided) => (
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
                        background: dueDateStatus === 'overdue'
                            ? 'rgba(255, 107, 107, 0.06)'
                            : 'rgba(255, 255, 255, 0.04)',
                        border: dueDateStatus === 'overdue'
                            ? '1px solid rgba(255, 107, 107, 0.35)'
                            : dueDateStatus === 'due-soon'
                                ? '1px solid rgba(251, 191, 36, 0.25)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: dueDateStatus === 'overdue'
                            ? '0 0 0 1px rgba(255, 107, 107, 0.15) inset'
                            : 'none',
                    }}
                >
                    <Stack gap={8}>
                        {/* Row 1: Handle, Title and Assignee/Menu */}
                        <Group justify="space-between" align="start" wrap="nowrap">
                            <Group gap={8} style={{ flex: 1, minWidth: 0 }}>
                                <IconGripVertical size={14} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
                                <Text size="sm" fw={700} c="white" style={{ flex: 1, lineHeight: 1.3 }}>
                                    {task.title}
                                </Text>
                            </Group>

                            <Group gap={4} wrap="nowrap" style={{ alignItems: 'flex-start' }}>
                                {/* Multi-assignee avatar stack */}
                                {(() => {
                                    const assignees = task.assignees && task.assignees.length > 0
                                        ? task.assignees
                                        : task.assigneeName
                                            ? [{ userId: task.assigneeId ?? 0, username: task.assigneeName }]
                                            : [];
                                    const visible = assignees.slice(0, 3);
                                    const overflow = assignees.length - visible.length;
                                    if (assignees.length === 0) return null;
                                    return (
                                        <Group gap={-4} wrap="nowrap">
                                            {visible.map(a => (
                                                <Tooltip key={a.userId} label={a.username} withinPortal position="top">
                                                    <Avatar
                                                        size={20} radius="xl" color="indigo"
                                                        styles={{ root: { border: '1px solid rgba(255,255,255,0.15)', marginLeft: -4 } }}
                                                    >
                                                        {a.username.slice(0, 2).toUpperCase()}
                                                    </Avatar>
                                                </Tooltip>
                                            ))}
                                            {overflow > 0 && (
                                                <Avatar size={20} radius="xl" color="gray"
                                                    styles={{ root: { border: '1px solid rgba(255,255,255,0.15)', marginLeft: -4 } }}
                                                >
                                                    +{overflow}
                                                </Avatar>
                                            )}
                                        </Group>
                                    );
                                })()}
                                {/* Paperclip badge */}
                                {task.attachments && task.attachments.length > 0 && (
                                    <Group gap={2}>
                                        <IconPaperclip size={11} color="rgba(255,255,255,0.4)" />
                                        <Text size="xs" c="dimmed" opacity={0.7}>{task.attachments.length}</Text>
                                    </Group>
                                )}

                                <Menu position="bottom-end" shadow="md" withinPortal>
                                    <Menu.Target>
                                        <ActionIcon
                                            variant="subtle"
                                            size="xs"
                                            color="gray"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <IconDots size={14} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item
                                            leftSection={<IconTrash size={14} />}
                                            color="red"
                                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                        >
                                            Delete Task
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
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

                                {task.totalTimeSpentMinutes > 0 && !task.isTimerRunning && (
                                    <Group gap={4} c="dimmed">
                                        <IconClock size={12} color="#4dabf7" />
                                        <Text size="xs" fw={700} c="white" opacity={0.6}>{Math.floor(task.totalTimeSpentMinutes / 60)}h {task.totalTimeSpentMinutes % 60}m</Text>
                                    </Group>
                                )}

                                {task.isTimerRunning && (
                                    <Group gap={4} c="blue">
                                        <IconClock size={12} />
                                        <Text size="xs" fw={700}>Running</Text>
                                    </Group>
                                )}

                                {task.dueDate && dueDateStatus && (
                                    <Tooltip
                                        label={STATUS_LABEL[dueDateStatus] || new Date(task.dueDate).toLocaleDateString()}
                                        disabled={dueDateStatus === 'upcoming'}
                                        position="top"
                                        withinPortal
                                    >
                                        <Group gap={3} style={{ cursor: 'default' }}>
                                            <IconCalendar size={12} color={STATUS_COLOR[dueDateStatus]} />
                                            <Text
                                                size="xs"
                                                fw={dueDateStatus !== 'upcoming' ? 700 : 500}
                                                style={{ color: STATUS_COLOR[dueDateStatus] }}
                                            >
                                                {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </Text>
                                        </Group>
                                    </Tooltip>
                                )}
                            </Group>
                        </Group>
                    </Stack>
                </Paper>
            )}
        </Draggable>
    );
});

export default TaskCard;
