import { Modal, TextInput, Select, NumberInput, Button, Group, Badge, TagsInput, Stack, Text, Progress, Checkbox, ActionIcon, ScrollArea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import type { TaskCard, BoardMember } from '../api/boards';
import { updateTask, createSubtask, updateSubtask, deleteSubtask, type Subtask, getTaskActivities, type TaskActivity } from '../api/tasks';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconUser, IconTag, IconTrash, IconMessageCircle } from '@tabler/icons-react';
import '@mantine/dates/styles.css';
import dayjs from 'dayjs';
import RichText from './RichText';
import ActivityLog from './ActivityLog';

interface TaskDetailModalProps {
    opened: boolean;
    onClose: () => void;
    task: TaskCard | null;
    members: BoardMember[];
    onTaskUpdated: (task: TaskCard) => void;
}

export default function TaskDetailModal({ opened, onClose, task, members, onTaskUpdated }: TaskDetailModalProps) {
    const form = useForm({
        initialValues: {
            title: '',
            description: '',
            priority: 'Low',
            dueDate: null as Date | null,
            storyPoints: 0 as number | null,
            assigneeId: null as string | null,
            tags: [] as string[],
            subtasks: [] as Subtask[]
        },
    });

    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [activities, setActivities] = useState<TaskActivity[]>([]);

    useEffect(() => {
        if (task) {
            const isDescDirty = form.isDirty('description');
            const currentDesc = form.values.description;

            form.setValues({
                title: task.title,
                description: isDescDirty ? currentDesc : (task.description || ''),
                priority: task.priority || 'Low',
                dueDate: task.dueDate ? new Date(task.dueDate) : null,
                storyPoints: task.storyPoints || 0,
                assigneeId: task.assigneeId ? task.assigneeId.toString() : null,
                tags: task.tags ? task.tags.split(',') : [],
                subtasks: task.subtasks || []
            });

            fetchActivities(task.id);
        }
    }, [task]);

    const fetchActivities = async (taskId: number) => {
        try {
            const data = await getTaskActivities(taskId);
            setActivities(data);
        } catch (error) {
            console.error("Failed to fetch activities", error);
        }
    };

    const calculateProgress = (subtasks: Subtask[]) => {
        if (!subtasks || subtasks.length === 0) return 0;
        const completed = subtasks.filter(s => s.isCompleted).length;
        return (completed / subtasks.length) * 100;
    };

    const handleAddSubtask = async () => {
        if (!task || !newSubtaskTitle.trim() || isAddingSubtask) return;
        setIsAddingSubtask(true);
        try {
            const newSubtask = await createSubtask(task.id, newSubtaskTitle);
            const currentSubtasks = form.values.subtasks || [];
            const exists = currentSubtasks.some(s => String(s.id) === String(newSubtask.id));
            if (!exists) {
                form.setFieldValue('subtasks', [...currentSubtasks, newSubtask]);
            }
            setNewSubtaskTitle('');
            notifications.show({ title: 'Subtask added', message: 'New subtask created', color: 'green' });
            fetchActivities(task.id);
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to create subtask', color: 'red' });
        } finally {
            setIsAddingSubtask(false);
        }
    };

    const handleToggleSubtask = async (subtaskId: number, checked: boolean) => {
        const subtasks = form.values.subtasks;
        const index = subtasks.findIndex(s => s.id === subtaskId);
        if (index === -1) return;
        form.setFieldValue(`subtasks.${index}.isCompleted`, checked);
        try {
            await updateSubtask(subtaskId, { isCompleted: checked });
            if (task) fetchActivities(task.id);
        } catch {
            form.setFieldValue(`subtasks.${index}.isCompleted`, !checked);
            notifications.show({ title: 'Error', message: 'Failed to update subtask', color: 'red' });
        }
    };

    const handleDeleteSubtask = async (subtaskId: number) => {
        const subtasks = form.values.subtasks;
        const updatedSubtasks = subtasks.filter(s => s.id !== subtaskId);
        form.setFieldValue('subtasks', updatedSubtasks);
        try {
            await deleteSubtask(subtaskId);
            if (task) fetchActivities(task.id);
        } catch {
            form.setFieldValue('subtasks', subtasks);
            notifications.show({ title: 'Error', message: 'Failed to delete subtask', color: 'red' });
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        if (!task) return;
        try {
            const assigneeId = values.assigneeId ? parseInt(values.assigneeId) : null;
            const updatedTask = await updateTask(task.id, {
                title: values.title,
                description: values.description,
                priority: values.priority,
                dueDate: values.dueDate ? dayjs(values.dueDate).toISOString() : null,
                storyPoints: values.storyPoints,
                assigneeId: (assigneeId && !isNaN(assigneeId)) ? assigneeId : null,
                tags: values.tags.length > 0 ? values.tags.join(',') : null
            });
            onTaskUpdated(updatedTask);
            notifications.show({ title: 'Success', message: 'Task updated', color: 'green' });
            onClose();
        } catch (error: any) {
            console.error('Failed to update task:', error);
            const message = error.response?.data?.message || error.response?.data?.details || 'Failed to update task';
            notifications.show({ title: 'Error', message, color: 'red' });
        }
    };

    if (!task) return null;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Badge size="lg" variant="dot" color={getPriorityColor(task.priority)}>{task.priority}</Badge>}
            size={1100}
            centered
            styles={{
                content: { background: '#1a1b1e', color: 'white' },
                header: { background: '#1a1b1e', color: 'white' },
                body: { background: '#1a1b1e', padding: 0 }
            }}
        >
            <div style={{ display: 'flex', minHeight: 520 }}>

                {/* ── Left Column: Task Form ── */}
                <ScrollArea style={{ flex: 1, minWidth: 0 }} styles={{ viewport: { padding: '20px 24px 24px' } }}>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <TextInput
                            label="Title"
                            placeholder="Task title"
                            required
                            mb="md"
                            {...form.getInputProps('title')}
                            styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                        />

                        <Stack gap={4} mb="md">
                            <Text size="sm" fw={500}>Description</Text>
                            <RichText
                                key={task.id}
                                content={form.values.description}
                                onChange={(val) => form.setFieldValue('description', val)}
                            />
                        </Stack>

                        <Stack gap={4} mb="md">
                            <Group justify="space-between">
                                <Text size="sm" fw={500}>Subtasks</Text>
                                <Text size="xs" c="dimmed">
                                    {form.values.subtasks?.filter(s => s.isCompleted).length || 0}/{form.values.subtasks?.length || 0}
                                </Text>
                            </Group>
                            <Progress
                                value={calculateProgress(form.values.subtasks)}
                                size="sm"
                                color={calculateProgress(form.values.subtasks) === 100 ? 'teal' : 'blue'}
                                mb="xs"
                            />
                            <Stack gap="xs">
                                {form.values.subtasks?.map(subtask => (
                                    <Group key={subtask.id} align="center" gap="sm">
                                        <Checkbox
                                            checked={subtask.isCompleted}
                                            onChange={(e) => handleToggleSubtask(subtask.id, e.currentTarget.checked)}
                                            color="teal"
                                        />
                                        <Text
                                            size="sm"
                                            td={subtask.isCompleted ? 'line-through' : 'none'}
                                            c={subtask.isCompleted ? 'dimmed' : 'white'}
                                            style={{ flex: 1 }}
                                        >
                                            {subtask.title}
                                        </Text>
                                        <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleDeleteSubtask(subtask.id)}>
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                ))}
                            </Stack>
                            <Group gap="xs" mt="xs">
                                <TextInput
                                    placeholder="Add a subtask..."
                                    style={{ flex: 1 }}
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.currentTarget.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); }
                                    }}
                                    styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                                />
                                <Button size="sm" color="violet" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim() || isAddingSubtask} type="button">
                                    {isAddingSubtask ? 'Adding...' : 'Add'}
                                </Button>
                            </Group>
                        </Stack>

                        <Group grow mb="md">
                            <Select
                                label="Priority"
                                data={['Low', 'Medium', 'High', 'Urgent']}
                                {...form.getInputProps('priority')}
                                styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                            />
                            <NumberInput
                                label="Story Points"
                                min={0}
                                {...form.getInputProps('storyPoints')}
                                styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                            />
                        </Group>

                        <Group grow mb="md">
                            <DateInput
                                label="Due Date"
                                placeholder="Pick date"
                                leftSection={<IconCalendar size={16} />}
                                clearable
                                {...form.getInputProps('dueDate')}
                                styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                            />
                            <Select
                                label="Assignee"
                                placeholder="Unassigned"
                                data={members.map(m => ({ value: m.userId.toString(), label: m.username }))}
                                leftSection={<IconUser size={16} />}
                                clearable
                                {...form.getInputProps('assigneeId')}
                                styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                            />
                        </Group>

                        <TagsInput
                            label="Tags"
                            placeholder="Type and press Enter"
                            data={['Frontend', 'Backend', 'Bug', 'Feature', 'Refactor', 'Design']}
                            clearable
                            leftSection={<IconTag size={16} />}
                            mb="xl"
                            {...form.getInputProps('tags')}
                            styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                        />

                        <Group justify="flex-end" mt="md" pb="lg">
                            <Button variant="default" onClick={onClose} styles={{ root: { background: 'transparent', color: 'white', borderColor: '#373A40' } }}>
                                Cancel
                            </Button>
                            <Button type="submit" color="violet">Save Changes</Button>
                        </Group>
                    </form>
                </ScrollArea>

                {/* ── Right Column: Activity & Comments ── */}
                <div style={{
                    width: 340,
                    flexShrink: 0,
                    borderLeft: '1px solid #2C2E33',
                    background: '#16171a',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {/* Sidebar header */}
                    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #2C2E33' }}>
                        <Group gap={8}>
                            <IconMessageCircle size={14} color="#6c757d" />
                            <Text
                                size="xs"
                                fw={700}
                                c="dimmed"
                                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
                            >
                                Activity &amp; Comments
                            </Text>
                        </Group>
                    </div>

                    {/* Scrollable activity list */}
                    <ScrollArea style={{ flex: 1 }} styles={{ viewport: { padding: '12px 12px' } }}>
                        <ActivityLog activities={activities} />
                    </ScrollArea>
                </div>
            </div>
        </Modal>
    );
}

function getPriorityColor(priority: string | undefined) {
    switch (priority) {
        case 'Urgent': return 'red';
        case 'High': return 'orange';
        case 'Medium': return 'yellow';
        case 'Low': return 'blue';
        default: return 'gray';
    }
}
