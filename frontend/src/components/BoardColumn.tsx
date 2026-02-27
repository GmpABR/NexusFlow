import { useState, memo, useRef, useEffect } from 'react';
import { Text, Group, Badge, TextInput, ActionIcon, Box, Menu, useComputedColorScheme, Modal, Button, Stack } from '@mantine/core';
import { IconPlus, IconDots, IconTrash, IconPencil, IconSparkles, IconWand } from '@tabler/icons-react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import type { Column, TaskCard as TaskCardType } from '../api/boards';
import { generateTasksForColumn, getApiKey } from '../api/ai';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

const COLUMN_COLORS: Record<string, string> = {
    'To Do': '#f59e0b',
    'In Progress': '#3b82f6',
    'Done': '#10b981',
};

interface Props {
    column: Column;
    onAddTask: (columnId: number, title: string, description?: string, priority?: string) => void;
    onDeleteTask: (taskId: number) => void;
    onTaskClick: (task: TaskCardType) => void;
    onDeleteColumn: (columnId: number) => void;
    onUpdateColumn: (columnId: number, name: string) => void;
    visibleTaskIds?: Set<number> | null;
    addTaskInputRef?: React.RefObject<HTMLInputElement | null>;
    innerRef?: (element: HTMLElement | null) => void;
    draggableProps?: any;
    dragHandleProps?: any;
    isClosed?: boolean;
    showAI?: boolean;
    isViewer?: boolean;
    boardName?: string;
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
    dragHandleProps,
    isClosed = false,
    showAI = false,
    isViewer = false,
    boardName = ''
}: Props) {
    const navigate = useNavigate();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showInput, setShowInput] = useState(false);
    const computedColorScheme = useComputedColorScheme('dark');

    // Rename state
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(column.name);
    const renameInputRef = useRef<HTMLInputElement>(null);

    // AI Generation State
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiInstruction, setAiInstruction] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

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

    const handleGenerateTasks = async () => {
        if (!getApiKey()) {
            notifications.show({
                title: 'AI Key Required',
                message: (
                    <Stack gap={8}>
                        <Text size="sm">Please add your OpenRouter API key in your profile settings to use AI features.</Text>
                        <Button
                            size="xs"
                            variant="light"
                            color="cyan"
                            onClick={() => {
                                navigate('/profile#ai-configuration');
                                notifications.clean();
                            }}
                        >
                            Configure AI Settings
                        </Button>
                    </Stack>
                ),
                color: 'orange',
                autoClose: 10000
            });
            return;
        }

        setIsGenerating(true);
        try {
            const existingTitles = column.taskCards.map(t => t.title);
            const tasks = await generateTasksForColumn(column.name, existingTitles, boardName, aiInstruction);
            console.log(`[BoardColumn] AI Generated Tasks for ${column.name}:`, tasks);
            for (const task of tasks) {
                console.log(`[BoardColumn] Adding Task: "${task.title}" with Description Length: ${task.description?.length}`);
                onAddTask(column.id, task.title, task.description, task.priority);
            }
            notifications.show({ title: 'AI Tasks Generated', message: `Added ${tasks.length} tasks to ${column.name}`, color: 'green' });
            setAiModalOpen(false);
            setAiInstruction('');
        } catch (error: any) {
            notifications.show({ title: 'AI Error', message: error.message || 'Failed to generate tasks', color: 'red' });
        } finally {
            setIsGenerating(false);
        }
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
                    background: computedColorScheme === 'dark' ? 'rgba(20, 21, 23, 0.95)' : 'rgba(255, 255, 255, 0.8)',
                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
                    borderRadius: 20,
                    zIndex: 0,
                    boxShadow: computedColorScheme === 'dark' ? '0 12px 48px rgba(0,0,0,0.4)' : '0 12px 48px rgba(0,0,0,0.05)',
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
                <Group justify="space-between" mb="md" {...dragHandleProps} style={{ cursor: isClosed ? 'default' : 'grab' }}>
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
                                c={computedColorScheme === 'dark' ? 'white' : 'dark'}
                                style={{ letterSpacing: '0.2px', cursor: (isClosed || isViewer) ? 'default' : 'pointer' }}
                                onDoubleClick={() => {
                                    if (isClosed || isViewer) return;
                                    setIsRenaming(true);
                                }}
                            >
                                {column.name}
                            </Text>
                        )}
                        <Badge variant="filled" color={computedColorScheme === 'dark' ? 'dark' : 'gray'} size="md" radius="sm" styles={{ root: { background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: computedColorScheme === 'dark' ? 'white' : 'black' } }}>
                            {visibleTaskIds
                                ? `${column.taskCards.filter(t => visibleTaskIds.has(t.id)).length}/${column.taskCards.length}`
                                : column.taskCards.length}
                        </Badge>
                    </Group>

                    {/* Column Actions Menu */}
                    {(!isClosed && !isViewer) && (
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
                    )}
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
                                        isViewer={isViewer}
                                    />
                                </div>
                            ))}
                            {provided.placeholder}
                        </Box>
                    )}
                </Droppable>

                {/* Add Task */}
                {(!isClosed && !isViewer) && (
                    <Group mt="md" gap="xs">
                        {showInput ? (
                            <Box style={{ flex: 1 }}>
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
                                    onBlur={() => {
                                        if (!newTaskTitle.trim()) {
                                            setShowInput(false);
                                        }
                                    }}
                                    ref={addTaskInputRef}
                                    autoFocus
                                    size="xs"
                                    styles={{ input: { background: computedColorScheme === 'dark' ? 'rgba(0,0,0,0.5)' : '#f8f9fa' } }}
                                    rightSection={
                                        <ActionIcon size="sm" variant="subtle" color="violet" onClick={handleAdd}>
                                            <IconPlus size={14} />
                                        </ActionIcon>
                                    }
                                />
                            </Box>
                        ) : (
                            <Group
                                gap="sm"
                                onClick={() => setShowInput(true)}
                                style={{
                                    flex: 1,
                                    cursor: 'pointer',
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    transition: 'all 0.15s ease',
                                    border: '1px solid transparent',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
                                    (e.currentTarget as HTMLElement).style.borderColor = computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                                }}
                            >
                                <IconPlus size={18} color={computedColorScheme === 'dark' ? 'white' : 'black'} style={{ opacity: 0.8 }} />
                                <Text size="sm" fw={600} c={computedColorScheme === 'dark' ? 'white' : 'dark'} opacity={0.7}>Add task</Text>
                            </Group>
                        )}
                        {showAI && (
                            <ActionIcon
                                variant="light"
                                color="violet"
                                size="lg"
                                radius="md"
                                onClick={() => setAiModalOpen(true)}
                                title="Generate tasks with AI"
                            >
                                <IconSparkles size={18} />
                            </ActionIcon>
                        )}
                    </Group>
                )}
            </Box>

            {/* AI Task Generation Modal */}
            <Modal
                opened={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                title={`Generate Tasks for ${column.name}`}
                centered
                radius="md"
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white' }
                }}
            >
                <Text size="sm" c="dimmed" mb="md">
                    Tell the AI what kind of tasks you want to see in this list. Leave blank for general suggestions.
                </Text>

                <TextInput
                    label="What kind of tasks?"
                    placeholder="e.g. Frontend bug fixes, Marketing assets, UX research..."
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.currentTarget.value)}
                    mb="lg"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateTasks()}
                />

                <Group justify="flex-end">
                    <Button variant="subtle" color="gray" onClick={() => setAiModalOpen(false)} disabled={isGenerating}>
                        Cancel
                    </Button>
                    <Button
                        variant="filled"
                        color="violet"
                        loading={isGenerating}
                        onClick={handleGenerateTasks}
                        leftSection={<IconWand size={16} />}
                    >
                        Generate
                    </Button>
                </Group>
            </Modal>
        </Box >
    );
});

export default BoardColumn;
