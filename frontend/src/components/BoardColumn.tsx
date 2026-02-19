import { useState, memo, useRef, useEffect } from 'react';
import { Text, Group, Badge, TextInput, ActionIcon, Box, Menu, Button } from '@mantine/core';
import { IconPlus, IconDots, IconTrash, IconPencil } from '@tabler/icons-react';
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
    onDeleteColumn: (columnId: number) => void;
    onUpdateColumn: (columnId: number, name: string) => void;
    visibleTaskIds?: Set<number> | null;
    addTaskInputRef?: React.RefObject<HTMLInputElement | null>;
    innerRef?: (element: HTMLElement | null) => void;
    draggableProps?: any;
    dragHandleProps?: any;
}

const BoardColumn = memo(function BoardColumn({
    column,
    onAddTask,
    onDeleteTask,
    onTaskClick,
    onDeleteColumn,
    onUpdateColumn,
    visibleTaskIds,
    addTaskInputRef,
    innerRef,
    draggableProps,
    dragHandleProps
}: Props) {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showInput, setShowInput] = useState(false);

    // Rename state
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(column.name);
    const renameInputRef = useRef<HTMLInputElement>(null);

    const accentColor = COLUMN_COLORS[column.name] || '#a855f7';

    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [isRenaming]);

    const handleAdd = () => {
        if (!newTaskTitle.trim()) return;
        onAddTask(column.id, newTaskTitle.trim());
        setNewTaskTitle('');
        setShowInput(false);
    };

    const handleRename = () => {
        if (!renameValue.trim()) {
            setRenameValue(column.name); // Revert if empty
            setIsRenaming(false);
            return;
        }
        if (renameValue.trim() !== column.name) {
            onUpdateColumn(column.id, renameValue.trim());
        }
        setIsRenaming(false);
    };

    return (
        <Box
            ref={innerRef}
            {...draggableProps}
            style={{
                minWidth: 320,
                maxWidth: 360,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100%',
                position: 'relative',
                ...draggableProps?.style,
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
                    overflow: 'hidden',
                }}
            >
                {/* Column Header */}
                <Group justify="space-between" mb="md" {...dragHandleProps} style={{ cursor: 'grab' }}>
                    <Group gap="sm" style={{ flex: 1 }}>
                        <Box
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: accentColor,
                                boxShadow: `0 0 12px ${accentColor}80`,
                            }}
                        />
                        {isRenaming ? (
                            <TextInput
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.currentTarget.value)}
                                onBlur={handleRename}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRename();
                                    if (e.key === 'Escape') {
                                        setRenameValue(column.name);
                                        setIsRenaming(false);
                                    }
                                }}
                                size="xs"
                                styles={{ input: { fontWeight: 700, height: 24, padding: '0 8px' } }}
                            />
                        ) : (
                            <Text
                                fw={700}
                                size="md"
                                c="white"
                                style={{ letterSpacing: '0.2px', cursor: 'pointer' }}
                                onDoubleClick={() => setIsRenaming(true)}
                            >
                                {column.name}
                            </Text>
                        )}
                        <Badge variant="filled" color="dark" size="md" radius="sm" styles={{ root: { background: 'rgba(255,255,255,0.1)' } }}>
                            {visibleTaskIds
                                ? `${column.taskCards.filter(t => visibleTaskIds.has(t.id)).length}/${column.taskCards.length}`
                                : column.taskCards.length}
                        </Badge>
                    </Group>

                    {/* Column Actions Menu */}
                    <Menu position="bottom-end" shadow="md" width={160}>
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" size="sm">
                                <IconDots size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => setIsRenaming(true)}>
                                Rename
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<IconTrash size={14} />}
                                color="red"
                                onClick={() => onDeleteColumn(column.id)}
                            >
                                Delete List
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
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
                                minHeight: 0,
                                padding: 4,
                                borderRadius: 8,
                                background: snapshot.isDraggingOver
                                    ? 'rgba(124, 58, 237, 0.06)'
                                    : 'transparent',
                                transition: 'background 0.2s ease',
                            }}
                        >
                            {column.taskCards.map((task: TaskCardType, index: number) => (
                                <div
                                    key={task.id}
                                    style={visibleTaskIds && !visibleTaskIds.has(task.id)
                                        ? { display: 'none' }
                                        : undefined}
                                >
                                    <TaskCard
                                        task={task}
                                        index={index}
                                        onDelete={onDeleteTask}
                                        onClick={onTaskClick}
                                    />
                                </div>
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
                            ref={addTaskInputRef}
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
        </Box >
    );
});

export default BoardColumn;
