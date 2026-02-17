import { Modal, TextInput, Textarea, Select, NumberInput, Button, Group, Badge, TagsInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import type { TaskCard, BoardMember } from '../api/boards';
import { updateTask } from '../api/tasks';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconUser, IconTag } from '@tabler/icons-react';
import '@mantine/dates/styles.css';
import dayjs from 'dayjs';

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
            assigneeId: null as string | null, // Select uses string values
            tags: [] as string[]
        },
    });

    useEffect(() => {
        if (task) {
            form.setValues({
                title: task.title,
                description: task.description || '',
                priority: task.priority || 'Low',
                dueDate: task.dueDate ? new Date(task.dueDate) : null,
                storyPoints: task.storyPoints || 0,
                assigneeId: task.assigneeId ? task.assigneeId.toString() : null,
                tags: task.tags ? task.tags.split(',') : []
            });
        }
    }, [task]);

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
            size="lg"
            centered
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput
                    label="Title"
                    placeholder="Task title"
                    required
                    mb="md"
                    {...form.getInputProps('title')}
                />

                <Textarea
                    label="Description"
                    placeholder="Detailed description..."
                    minRows={4}
                    mb="md"
                    {...form.getInputProps('description')}
                />

                <Group grow mb="md">
                    <Select
                        label="Priority"
                        data={['Low', 'Medium', 'High', 'Urgent']}
                        {...form.getInputProps('priority')}
                    />
                    <NumberInput
                        label="Story Points"
                        min={0}
                        {...form.getInputProps('storyPoints')}
                    />
                </Group>

                <Group grow mb="md">
                    <DateInput
                        label="Due Date"
                        placeholder="Pick date"
                        leftSection={<IconCalendar size={16} />}
                        clearable
                        {...form.getInputProps('dueDate')}
                    />
                    <Select
                        label="Assignee"
                        placeholder="Unassigned"
                        data={members.map(m => ({ value: m.userId.toString(), label: m.username }))}
                        leftSection={<IconUser size={16} />}
                        clearable
                        {...form.getInputProps('assigneeId')}
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
                />

                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>Cancel</Button>
                    <Button type="submit" color="blue">Save Changes</Button>
                </Group>
            </form>
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
