import { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    Stack,
    Button,
    Text,
    Group,
    ActionIcon,
    Select,
    Paper,
    Badge,
    Loader,
    Center,
    TextInput,
    NumberInput
} from '@mantine/core';
import { IconTrash, IconRobot, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    getAutomations,
    createAutomation,
    deleteAutomation,
    type Automation,
    type CreateAutomationDto
} from '../api/automations';
import { type BoardDetail } from '../api/boards';

interface BoardAutomationsModalProps {
    opened: boolean;
    onClose: () => void;
    board: BoardDetail;
}

export default function BoardAutomationsModal({ opened, onClose, board }: BoardAutomationsModalProps) {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [triggerCondition, setTriggerCondition] = useState<string | null>(null);
    const [actionType, setActionType] = useState<string | null>(null);
    const [actionValue, setActionValue] = useState<string | null>(null);

    useEffect(() => {
        if (opened) {
            loadAutomations();
            setShowForm(false);
            resetForm();
        }
    }, [opened, board.id]);

    const canManageAutomations = board.userRole === 'Owner' || board.userRole === 'Admin';

    const loadAutomations = async () => {
        try {
            setLoading(true);
            const data = await getAutomations(board.id);
            setAutomations(data);
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to load automations.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTriggerCondition(null);
        setActionType(null);
        setActionValue(null);
    };

    const handleCreate = async () => {
        if (!canManageAutomations) return;
        if (!triggerCondition || !actionType) return;
        if (['AssignToUser', 'AddLabel', 'SetPriority'].includes(actionType) && !actionValue) return;

        try {
            setCreating(true);
            const dto: CreateAutomationDto = {
                triggerType: 'TaskMovedToColumn', // Currently the only trigger type supported
                triggerCondition,
                actionType,
                actionValue: actionValue || ''
            };
            const newAutomation = await createAutomation(board.id, dto);
            setAutomations([...automations, newAutomation]);
            setShowForm(false);
            resetForm();
            notifications.show({ title: 'Success', message: 'Automation Rule Created', color: 'green' });
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to create automation.', color: 'red' });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!canManageAutomations) return;
        try {
            await deleteAutomation(id);
            setAutomations(automations.filter(a => a.id !== id));
            notifications.show({ title: 'Success', message: 'Rule deleted', color: 'blue' });
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to delete automation.', color: 'red' });
        }
    };

    // Prepare dropdown data memoized to avoid re-calculating on every animation frame
    const columnData = useMemo(() => board.columns.map(c => ({ value: c.id.toString(), label: c.name })), [board.columns]);
    const memberData = useMemo(() => board.members.map(m => ({ value: m.userId.toString(), label: m.username || 'Unknown' })), [board.members]);
    const labelData = useMemo(() => board.labels.map(l => ({ value: l.id.toString(), label: l.name || 'Unnamed Label' })), [board.labels]);

    // Fast lookup maps
    const columnMap = useMemo(() => new Map(board.columns.map(c => [c.id.toString(), c.name])), [board.columns]);
    const memberMap = useMemo(() => new Map(board.members.map(m => [m.userId.toString(), m.username])), [board.members]);
    const labelMap = useMemo(() => new Map(board.labels.map(l => [l.id.toString(), l.name])), [board.labels]);

    const getColumnName = (colId: string) => columnMap.get(colId) || 'Unknown Column';
    const getMemberName = (userId: string) => memberMap.get(userId) || 'Unknown User';
    const getLabelName = (labelId: string) => labelMap.get(labelId) || 'Unknown Label';

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="sm">
                    <IconRobot size={24} color="#845ef7" />
                    <Text fw={700} size="lg">Board Automations</Text>
                </Group>
            }
            size="lg"
            radius="md"
            centered
            yOffset="10vh"
            overlayProps={{ blur: 2, opacity: 0.55 }}
        >
            <Stack gap="lg">
                <Text size="sm" c="dimmed">
                    Automations run instantly when triggers are met, helping your team save time on repetitive tasks!
                </Text>

                {loading ? (
                    <Center py="xl"><Loader size="md" variant="dots" /></Center>
                ) : (
                    <Stack gap="sm">
                        {automations.map(a => (
                            <Paper key={a.id} withBorder p="md" radius="md">
                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                    <Stack gap="xs" style={{ flex: 1 }}>
                                        <Group gap="xs">
                                            <Badge color="blue" variant="light">WHEN</Badge>
                                            <Text size="sm" fw={500}>Task moves to <b>{getColumnName(a.triggerCondition)}</b></Text>
                                        </Group>
                                        <Group gap="xs">
                                            <Badge color="violet" variant="light">THEN</Badge>
                                            {a.actionType === 'CompleteSubtasks' && (
                                                <Text size="sm">Cross out all subtasks</Text>
                                            )}
                                            {a.actionType === 'AssignToUser' && (
                                                <Text size="sm">Assign to <b>{getMemberName(a.actionValue)}</b></Text>
                                            )}
                                            {a.actionType === 'ClearAssignee' && (
                                                <Text size="sm">Remove assigned user</Text>
                                            )}
                                            {a.actionType === 'SetPriority' && (
                                                <Text size="sm">Set priority to <b>{a.actionValue}</b></Text>
                                            )}
                                            {a.actionType === 'AddLabel' && (
                                                <Text size="sm">Add label <b>{getLabelName(a.actionValue)}</b></Text>
                                            )}
                                            {a.actionType === 'RemoveLabel' && (
                                                <Text size="sm">Remove label <b>{getLabelName(a.actionValue)}</b></Text>
                                            )}
                                            {a.actionType === 'PostComment' && (
                                                <Text size="sm">Post comment: <i>"{a.actionValue}"</i></Text>
                                            )}
                                            {a.actionType === 'SetDueDate' && (
                                                <Text size="sm">Set due date to <b>{a.actionValue} days</b> from now</Text>
                                            )}
                                            {a.actionType === 'AiSummary' && (
                                                <Text size="sm">🤖 Generate <b>AI Summary</b> upon completion</Text>
                                            )}
                                        </Group>
                                    </Stack>
                                    {canManageAutomations && (
                                        <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(a.id)}>
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    )}
                                </Group>
                            </Paper>
                        ))}

                        {automations.length === 0 && !showForm && (
                            <Text c="dimmed" size="sm" ta="center" py="md">No automations created yet.</Text>
                        )}

                        {canManageAutomations && !showForm && (
                            <Button
                                variant="light"
                                color="violet"
                                leftSection={<IconPlus size={16} />}
                                onClick={() => setShowForm(true)}
                                fullWidth
                                mt="sm"
                            >
                                Add Rule
                            </Button>
                        )}
                        {canManageAutomations && showForm && (
                            <Paper withBorder p="md" radius="md">
                                <Stack gap="md">
                                    <Text fw={600} size="sm">Create New Rule</Text>

                                    <Select
                                        label="When a task moves to..."
                                        placeholder="Select column"
                                        data={columnData}
                                        value={triggerCondition}
                                        onChange={setTriggerCondition}
                                        required
                                        comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                                    />

                                    <Select
                                        label="Then specifically..."
                                        placeholder="Select action"
                                        data={[
                                            { value: 'CompleteSubtasks', label: 'Cross out all subtasks' },
                                            { value: 'AssignToUser', label: 'Assign task to a specific user' },
                                            { value: 'ClearAssignee', label: 'Remove the assigned user' },
                                            { value: 'SetPriority', label: 'Change task priority' },
                                            { value: 'AddLabel', label: 'Add a specific label' },
                                            { value: 'RemoveLabel', label: 'Remove a specific label' },
                                            { value: 'PostComment', label: 'Post a comment' },
                                            { value: 'SetDueDate', label: 'Set relative due date' },
                                            { value: 'AiSummary', label: '🤖 AI: Generate summary' }
                                        ]}
                                        value={actionType}
                                        onChange={(val) => {
                                            setActionType(val);
                                            setActionValue(null);
                                        }}
                                        required
                                        comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                                    />

                                    {actionType === 'AssignToUser' && (
                                        <Select
                                            label="Assign to"
                                            placeholder="Select member"
                                            data={memberData}
                                            value={actionValue}
                                            onChange={setActionValue}
                                            required
                                            searchable
                                            comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                                        />
                                    )}
                                    {actionType === 'SetPriority' && (
                                        <Select
                                            label="Priority"
                                            placeholder="Select priority level"
                                            data={['Low', 'Medium', 'High', 'Urgent']}
                                            value={actionValue}
                                            onChange={setActionValue}
                                            required
                                            comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                                        />
                                    )}
                                    {actionType === 'AddLabel' && (
                                        <Select
                                            label="Label to Add"
                                            placeholder="Select label"
                                            data={labelData}
                                            value={actionValue}
                                            onChange={setActionValue}
                                            required
                                            searchable
                                            comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                                        />
                                    )}
                                    {actionType === 'RemoveLabel' && (
                                        <Select
                                            label="Label to Remove"
                                            placeholder="Select label"
                                            data={labelData}
                                            value={actionValue}
                                            onChange={setActionValue}
                                            required
                                            searchable
                                            comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                                        />
                                    )}
                                    {actionType === 'PostComment' && (
                                        <TextInput
                                            label="Comment Text"
                                            placeholder="Type the automated comment..."
                                            value={actionValue || ''}
                                            onChange={(e) => setActionValue(e.currentTarget.value)}
                                            required
                                        />
                                    )}
                                    {actionType === 'SetDueDate' && (
                                        <NumberInput
                                            label="Days from now"
                                            placeholder="e.g. 3"
                                            min={0}
                                            max={365}
                                            value={actionValue ? parseInt(actionValue) : undefined}
                                            onChange={(val) => setActionValue(val.toString())}
                                            required
                                        />
                                    )}
                                    {actionType === 'AiSummary' && (
                                        <Text size="xs" c="cyan" fs="italic">
                                            The AI will analyze the task description and comments to post a professional summary when this trigger is met.
                                        </Text>
                                    )}

                                    <Group justify="flex-end" mt="sm">
                                        <Button variant="default" onClick={() => setShowForm(false)}>Cancel</Button>
                                        <Button
                                            color="violet"
                                            onClick={handleCreate}
                                            loading={creating}
                                            disabled={!triggerCondition || !actionType || (['AssignToUser', 'SetPriority', 'AddLabel', 'RemoveLabel', 'PostComment', 'SetDueDate'].includes(actionType) && !actionValue)}
                                        >
                                            Save Rule
                                        </Button>
                                    </Group>
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                )}
            </Stack>
        </Modal>
    );
}
