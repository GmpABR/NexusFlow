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
                minWidth: 320,
                maxWidth: 360,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 180px)',
                position: 'relative',
            }}
        >
            {/* Glass Background Layer */}
            <Box
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(20, 21, 23, 0.85)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 20,
                    zIndex: 0,
                    boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                }}
            />

            {/* Content Layer */}
            <Box
                p="lg"
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                }}
            >
                {/* Column Header */}
                <Group justify="space-between" mb="md">
                    <Group gap="sm">
                        <Box
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: accentColor,
                                boxShadow: `0 0 12px ${accentColor}80`,
                            }}
                        />
                        <Text fw={700} size="md" c="white" style={{ letterSpacing: '0.2px' }}>
                            {column.name}
                        </Text>
                    </Group>
                    <Badge variant="filled" color="dark" size="md" radius="sm" styles={{ root: { background: 'rgba(255,255,255,0.1)' } }}>
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
                        mt="md"
                        gap="sm"
                        onClick={() => setShowInput(true)}
                        style={{
                            cursor: 'pointer',
                            padding: '10px 12px',
                            borderRadius: 10,
                            transition: 'all 0.15s ease',
                            border: '1px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                        }}
                    >
                        <IconPlus size={18} color="white" style={{ opacity: 0.8 }} />
                        <Text size="sm" fw={600} c="white" opacity={0.7}>Add task</Text>
                    </Group>
                )}
            </Box>
        </Box>
    );
});

export default BoardColumn;
