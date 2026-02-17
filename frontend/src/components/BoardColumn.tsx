import { useState, memo } from 'react';
import { Text, Group, Badge, TextInput, ActionIcon, Box } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import type { Column, TaskCard as TaskCardType } from '../api/boards';

const COLUMN_COLORS: Record<string, string> = {
    'To Do': '#f59e0b',
    'In Progress': '#3b82f6',
    'Done': '#10b981',
};

interface Props {
    column: Column;
    onAddTask: (columnId: number, title: string) => void;
    onDeleteTask: (taskId: number) => void;
    onTaskClick: (task: TaskCardType) => void;
}

const BoardColumn = memo(function BoardColumn({ column, onAddTask, onDeleteTask, onTaskClick }: Props) {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showInput, setShowInput] = useState(false);
    const accentColor = COLUMN_COLORS[column.name] || '#a855f7';

    const handleAdd = () => {
        if (!newTaskTitle.trim()) return;
        onAddTask(column.id, newTaskTitle.trim());
        setNewTaskTitle('');
        setShowInput(false);
    };

    return (
        <Box
            style={{
                minWidth: 300,
                maxWidth: 340,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 160px)',
                position: 'relative',
            }}
        >
            {/* Glass Background Layer */}
            <Box
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(20, 21, 23, 0.75)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 16,
                    zIndex: 0,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                }}
            />

            {/* Content Layer */}
            <Box
                p="md"
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                }}
            >
                {/* Column Header */}
                <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                        <Box
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: accentColor,
                                boxShadow: `0 0 8px ${accentColor}60`,
                            }}
                        />
                        <Text fw={600} size="sm" c="white">
                            {column.name}
                        </Text>
                    </Group>
                    <Badge variant="light" color="gray" size="sm" radius="md">
                        {column.taskCards.length}
                    </Badge>
                </Group>

                {/* Task List (Droppable) */}
                <Droppable droppableId={`column-${column.id}`} type="TASK">
                    {(provided, snapshot) => (
                        <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                minHeight: 60,
                                padding: 4,
                                borderRadius: 8,
                                background: snapshot.isDraggingOver
                                    ? 'rgba(124, 58, 237, 0.06)'
                                    : 'transparent',
                                transition: 'background 0.2s ease',
                            }}
                        >
                            {column.taskCards.map((task: TaskCardType, index: number) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    index={index}
                                    onDelete={onDeleteTask}
                                    onClick={onTaskClick}
                                />
                            ))}
                            {provided.placeholder}
                        </Box>
                    )}
                </Droppable>

                {/* Add Task */}
                {showInput ? (
                    <Box mt="sm">
                        <TextInput
                            placeholder="Task title..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.currentTarget.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAdd();
                                if (e.key === 'Escape') {
                                    setShowInput(false);
                                    setNewTaskTitle('');
                                }
                            }}
                            autoFocus
                            size="xs"
                            styles={{ input: { background: 'rgba(0,0,0,0.5)' } }}
                            rightSection={
                                <ActionIcon size="sm" variant="subtle" color="violet" onClick={handleAdd}>
                                    <IconPlus size={14} />
                                </ActionIcon>
                            }
                        />
                    </Box>
                ) : (
                    <Group
                        mt="sm"
                        gap="xs"
                        onClick={() => setShowInput(true)}
                        style={{
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: 8,
                            transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(55, 58, 64, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                    >
                        <IconPlus size={14} color="#909296" />
                        <Text size="xs" c="dimmed">Add task</Text>
                    </Group>
                )}
            </Box>
        </Box>
    );
});

export default BoardColumn;
