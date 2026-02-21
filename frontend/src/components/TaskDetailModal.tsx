import { Modal, TextInput, Select, MultiSelect, NumberInput, Button, Group, Badge, TagsInput, Stack, Text, Progress, Checkbox, ActionIcon, ScrollArea, Loader } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect, useState, useRef } from 'react';
import type { TaskCard, Attachment } from '../api/boards';
import { updateTask, createSubtask, updateSubtask, deleteSubtask, type Subtask, getTaskActivities, type TaskActivity, addComment, registerAttachment, deleteAttachment } from '../api/tasks';
import { startTimer, stopTimer } from '../api/timelogs';
import { notifications } from '@mantine/notifications';
import { IconCalendar, IconUser, IconTag, IconTrash, IconMessageCircle, IconClock, IconPlayerPlay, IconPlayerStop, IconAlertCircle, IconPaperclip, IconDownload, IconUpload } from '@tabler/icons-react';
import '@mantine/dates/styles.css';
import dayjs from 'dayjs';
import RichText from './RichText';
import ActivityLog from './ActivityLog';
import { uploadTaskAttachment, removeTaskAttachment } from '../api/storage';

interface TaskDetailModalProps {
    opened: boolean;
    onClose: () => void;
    task: TaskCard | null;
    members: BoardMember[];
    onTaskUpdated: (task: TaskCard) => void;
}

type BoardMember = import('../api/boards').BoardMember;

export default function TaskDetailModal({ opened, onClose, task, members, onTaskUpdated }: TaskDetailModalProps) {
    const form = useForm({
        initialValues: {
            title: '',
            description: '',
            priority: 'Low',
            dueDate: null as Date | null,
            storyPoints: 0 as number | null,
            assigneeId: null as string | null,
            assigneeIds: [] as string[],
            tags: [] as string[],
            subtasks: [] as Subtask[]
        },
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [activities, setActivities] = useState<TaskActivity[]>([]);

    // Comments
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
                assigneeIds: task.assignees?.map(a => a.userId.toString()) ?? (task.assigneeId ? [task.assigneeId.toString()] : []),
                tags: task.tags ? task.tags.split(',') : [],
                subtasks: task.subtasks || []
            });

            setAttachments(task.attachments ?? []);
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

    const handleAddComment = async () => {
        if (!task || !newComment.trim() || isSubmittingComment) return;
        setIsSubmittingComment(true);

        const commentText = newComment;
        setNewComment('');

        // 1. Optimistic Update: instantly append to the feed
        const tempActivity: TaskActivity = {
            id: Date.now(), // Fake ID
            taskCardId: task.id,
            userId: 0, // Current user id conceptually, but avatar logic might miss it temporarily unless we find it from members. 
            // But often UI just needs the text to appear.
            user: { id: 0, username: 'You', email: '' }, // Fallback for optimistic
            action: 'Commented',
            details: commentText,
            timestamp: new Date().toISOString()
        };

        setActivities(prev => [tempActivity, ...prev]);

        // 2. Background API call
        try {
            await addComment(task.id, commentText);
            // Replace exact temp comment with real data by refetching
            fetchActivities(task.id);
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to post comment', color: 'red' });
            // Revert on failure
            setActivities(prev => prev.filter(a => a.id !== tempActivity.id));
        } finally {
            setIsSubmittingComment(false);
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

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!task || !e.target.files?.length) return;
        const file = e.target.files[0];
        setIsUploading(true);
        try {
            const { path, publicUrl } = await uploadTaskAttachment(file, task.id);
            const saved = await registerAttachment(task.id, {
                fileName: file.name,
                storagePath: path,
                publicUrl,
                contentType: file.type || 'application/octet-stream',
                fileSizeBytes: file.size
            });
            setAttachments(prev => [saved, ...prev]);
            notifications.show({ title: 'Uploaded', message: file.name, color: 'green' });
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            notifications.show({ title: 'Upload failed', message: err.message ?? 'Unknown error', color: 'red' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (att: Attachment) => {
        if (!task) return;
        try {
            await deleteAttachment(task.id, att.id);
            await removeTaskAttachment(att.storagePath);
            setAttachments(prev => prev.filter(a => a.id !== att.id));
            notifications.show({ title: 'Removed', message: att.fileName, color: 'blue' });
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to remove attachment', color: 'red' });
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        if (!task) return;
        try {
            const assigneeId = values.assigneeId ? parseInt(values.assigneeId) : null;
            const assigneeIds = values.assigneeIds.map(Number).filter(Boolean);
            const updatedTask = await updateTask(task.id, {
                title: values.title,
                description: values.description,
                priority: values.priority,
                dueDate: values.dueDate ? dayjs(values.dueDate).toISOString() : null,
                storyPoints: values.storyPoints,
                assigneeId: (assigneeId && !isNaN(assigneeId)) ? assigneeId : null,
                assigneeIds,
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

    const handleToggleTimer = async () => {
        if (!task) return;

        // 1. Optimistic UI update on the parent task reference
        const previousState = task.isTimerRunning;
        const newState = !previousState;

        // Optimistically update the UI by firing the provided callback
        onTaskUpdated({ ...task, isTimerRunning: newState });

        if (newState) {
            notifications.show({ title: 'Timer Started', message: 'Tracking time for this task', color: 'green' });
        } else {
            notifications.show({ title: 'Timer Stopped', message: 'Time logged successfully', color: 'blue' });
        }

        // 2. Background API Call
        try {
            if (previousState) {
                await stopTimer(task.id);
            } else {
                await startTimer(task.id);
            }
            // Sync up exactly after API returns
            fetchActivities(task.id);
        } catch (error: any) {
            // Revert on failure
            onTaskUpdated({ ...task, isTimerRunning: previousState });
            notifications.show({ title: 'Error', message: error.response?.data?.message || 'Failed to toggle timer', color: 'red' });
        }
    };

    if (!task) return null;

    // Due date urgency
    const dueDateStatus = (() => {
        if (!task.dueDate) return null;
        const diffMs = new Date(task.dueDate).getTime() - Date.now();
        if (diffMs < 0) return 'overdue' as const;
        if (diffMs <= 24 * 60 * 60 * 1000) return 'due-soon' as const;
        return null;
    })();

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Group>
                <Badge size="lg" variant="dot" color={getPriorityColor(task.priority)}>{task.priority}</Badge>
                {dueDateStatus === 'overdue' && (
                    <Badge size="sm" color="red" variant="light" leftSection={<IconAlertCircle size={10} />}>Overdue</Badge>
                )}
                {dueDateStatus === 'due-soon' && (
                    <Badge size="sm" color="yellow" variant="light" leftSection={<IconAlertCircle size={10} />}>Due Soon</Badge>
                )}
                {task.isTimerRunning && <Badge size="sm" color="blue" variant="light" leftSection={<IconClock size={10} />}>Timer Running</Badge>}
            </Group>}
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
                        <Group align="flex-end" mb="md" gap="md">
                            <TextInput
                                style={{ flex: 1 }}
                                label="Title"
                                placeholder="Task title"
                                required
                                {...form.getInputProps('title')}
                                styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40', fontSize: '1.2rem', fontWeight: 600 } }}
                            />

                            <Stack gap={2} align="center">
                                <Text size="xs" c="dimmed" fw={600}>TIME SPENT</Text>
                                <Group gap="xs">
                                    <Badge size="lg" variant="filled" color={task.isTimerRunning ? 'blue' : 'dark'} styles={{ root: { minWidth: 80 } }}>
                                        {Math.floor(task.totalTimeSpentMinutes / 60)}h {task.totalTimeSpentMinutes % 60}m
                                    </Badge>
                                    <Button
                                        size="compact-md"
                                        variant={task.isTimerRunning ? "light" : "filled"}
                                        color={task.isTimerRunning ? "red" : "blue"}
                                        onClick={handleToggleTimer}
                                        leftSection={task.isTimerRunning ? <IconPlayerStop size={14} /> : <IconPlayerPlay size={14} />}
                                    >
                                        {task.isTimerRunning ? "Stop" : "Start"}
                                    </Button>
                                </Group>
                            </Stack>
                        </Group>

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
                                label={<span style={{ color: dueDateStatus === 'overdue' ? '#ff6b6b' : dueDateStatus === 'due-soon' ? '#fbbf24' : 'inherit' }}>
                                    Due Date{dueDateStatus === 'overdue' ? ' ⚠ Overdue' : dueDateStatus === 'due-soon' ? ' ⚠ Due Soon' : ''}
                                </span>}
                                placeholder="Pick date"
                                leftSection={<IconCalendar size={16} color={dueDateStatus === 'overdue' ? '#ff6b6b' : dueDateStatus === 'due-soon' ? '#fbbf24' : undefined} />}
                                clearable
                                {...form.getInputProps('dueDate')}
                                styles={{
                                    input: {
                                        background: '#25262b',
                                        color: 'white',
                                        borderColor: dueDateStatus === 'overdue' ? 'rgba(255,107,107,0.5)' : dueDateStatus === 'due-soon' ? 'rgba(251,191,36,0.4)' : '#373A40',
                                    }
                                }}
                            />
                            <MultiSelect
                                label="Assignees"
                                placeholder="Pick members"
                                data={members.map(m => ({ value: m.userId.toString(), label: m.username }))}
                                leftSection={<IconUser size={16} />}
                                clearable
                                searchable
                                {...form.getInputProps('assigneeIds')}
                                styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                            />
                        </Group>

                        {/* Attachments Section */}
                        <Stack gap={6} mb="md">
                            <Group justify="space-between">
                                <Group gap={6}>
                                    <IconPaperclip size={14} color="rgba(255,255,255,0.5)" />
                                    <Text size="sm" fw={500}>Attachments</Text>
                                    {attachments.length > 0 && (
                                        <Badge size="xs" variant="filled" color="dark">{attachments.length}</Badge>
                                    )}
                                </Group>
                                <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="violet"
                                    leftSection={isUploading ? <Loader size={10} color="white" /> : <IconUpload size={12} />}
                                    disabled={isUploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    type="button"
                                >
                                    {isUploading ? 'Uploading…' : 'Attach File'}
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={handleUpload}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                />
                            </Group>
                            {attachments.length === 0 ? (
                                <Text size="xs" c="dimmed">No attachments yet</Text>
                            ) : (
                                <Stack gap={4}>
                                    {attachments.map(att => {
                                        const isImage = att.contentType.startsWith('image/');
                                        const sizeKb = (att.fileSizeBytes / 1024).toFixed(1);
                                        return (
                                            <Group key={att.id} gap={8} style={{
                                                padding: '6px 8px',
                                                background: 'rgba(255,255,255,0.04)',
                                                borderRadius: 6,
                                                border: '1px solid rgba(255,255,255,0.07)'
                                            }}>
                                                {isImage ? (
                                                    <img
                                                        src={att.publicUrl}
                                                        alt={att.fileName}
                                                        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                                                        background: 'rgba(139,92,246,0.2)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <IconPaperclip size={16} color="#a78bfa" />
                                                    </div>
                                                )}
                                                <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                                                    <Text size="xs" fw={600} c="white" truncate>{att.fileName}</Text>
                                                    <Text size="xs" c="dimmed">{sizeKb} KB · {att.uploadedByUsername}</Text>
                                                </Stack>
                                                <Group gap={4}>
                                                    <ActionIcon
                                                        component="a"
                                                        href={att.publicUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        size="sm" variant="subtle" color="gray"
                                                    >
                                                        <IconDownload size={14} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        size="sm" variant="subtle" color="red"
                                                        onClick={() => handleDeleteAttachment(att)}
                                                    >
                                                        <IconTrash size={14} />
                                                    </ActionIcon>
                                                </Group>
                                            </Group>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Stack>

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

                    {/* Add Comment Input */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #2C2E33', background: '#1a1b1e' }}>
                        <TextInput
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.currentTarget.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); }
                            }}
                            styles={{ input: { background: '#25262b', color: 'white', borderColor: '#373A40' } }}
                            rightSection={
                                <ActionIcon
                                    size={28}
                                    color="violet"
                                    variant="filled"
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || isSubmittingComment}
                                >
                                    <IconMessageCircle size={16} />
                                </ActionIcon>
                            }
                        />
                    </div>
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
