import { Avatar, Text, Timeline, ScrollArea, useComputedColorScheme, ActionIcon, Group, Badge, Popover, Tooltip, Skeleton, Stack, TextInput, Button, Menu, Box } from '@mantine/core';
import type { TaskActivity, Reaction } from '../api/tasks';
import { deleteComment, toggleReaction, updateComment } from '../api/tasks';
import { formatDistanceToNow } from 'date-fns';
import { IconTrash, IconPlus, IconPencil, IconCheck, IconX, IconDots } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useEffect, useRef, useState } from 'react';

interface ActivityLogProps {
    activities: TaskActivity[];
    currentUserId: number;
    boardRole: string;
    onRefresh: () => void;
    loading?: boolean;
}


export default function ActivityLog({ activities, currentUserId, boardRole, onRefresh, loading }: ActivityLogProps) {
    const viewport = useRef<HTMLDivElement>(null);
    const computedColorScheme = useComputedColorScheme('dark');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [openedPickerId, setOpenedPickerId] = useState<number | null>(null);
    const [localActivities, setLocalActivities] = useState<TaskActivity[]>(activities);

    const canDelete = (activity: TaskActivity) => {
        if (activity.action !== 'Commented') return false;
        // Using loose equality in case one is string and other is number
        return activity.userId == currentUserId || boardRole === 'Owner' || boardRole === 'Admin';
    };

    const canEdit = (activity: TaskActivity) => {
        return activity.action === 'Commented' && activity.userId == currentUserId;
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteComment(id);
            notifications.show({ title: 'Success', message: 'Comment deleted', color: 'blue' });
            onRefresh();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to delete comment', color: 'red' });
        }
    };

    const handleReaction = async (id: number, emoji: string) => {
        setOpenedPickerId(null); // Close picker immediately

        // 1. Optimistic Update
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;

        const previousActivities = [...localActivities];
        setLocalActivities(prev => prev.map(a => {
            if (a.id !== id) return a;

            const existingReactionIndex = (a.reactions || []).findIndex(r => r.userId === currentUserId && r.emoji === emoji);
            let newReactions = [...(a.reactions || [])];

            if (existingReactionIndex !== -1) {
                // Remove reaction
                newReactions.splice(existingReactionIndex, 1);
            } else {
                // Add reaction
                newReactions.push({
                    id: Date.now(), // Temp ID
                    userId: currentUserId,
                    username: currentUser?.username || 'You',
                    emoji: emoji
                });
            }

            return { ...a, reactions: newReactions };
        }));

        try {
            await toggleReaction(id, emoji);
            onRefresh();
        } catch (error) {
            console.error(`[ActivityLog] Failed to toggle reaction:`, error);
            notifications.show({ title: 'Error', message: 'Failed to update reaction', color: 'red' });
            // Revert on failure
            setLocalActivities(previousActivities);
        }
    };

    const handleStartEdit = (activity: TaskActivity) => {
        setEditingId(activity.id);
        setEditingText(activity.details);
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editingText.trim()) return;
        setIsSaving(true);
        try {
            await updateComment(editingId, editingText);
            notifications.show({
                title: 'Success',
                message: 'Comment updated',
                color: 'green'
            });
            setEditingId(null);
            onRefresh();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to update comment',
                color: 'red'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Group reactions by emoji
    const getGroupedReactions = (reactions?: Reaction[]) => {
        if (!reactions) return [];
        const groups: Record<string, { emoji: string; count: number; users: string[]; hasReacted: boolean }> = {};

        reactions.forEach(r => {
            if (!groups[r.emoji]) {
                groups[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasReacted: false };
            }
            groups[r.emoji].count++;
            groups[r.emoji].users.push(r.username);
            if (r.userId === currentUserId) {
                groups[r.emoji].hasReacted = true;
            }
        });

        return Object.values(groups);
    };

    const scrollToTop = () => {
        if (viewport.current) {
            viewport.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        setLocalActivities(activities);
        scrollToTop();
    }, [activities]);

    if (loading && activities.length === 0) {
        return (
            <Stack gap="xl" p="md">
                {[1, 2, 3].map(i => (
                    <Group key={i} align="flex-start" wrap="nowrap">
                        <Skeleton height={24} circle />
                        <Stack gap="xs" style={{ flex: 1 }}>
                            <Skeleton height={12} width="40%" radius="xl" />
                            <Skeleton height={14} width="90%" radius="xl" />
                        </Stack>
                    </Group>
                ))}
            </Stack>
        );
    }

    return (
        <ScrollArea h="100%" type="auto" offsetScrollbars viewportRef={viewport}>
            {!activities || activities.length === 0 ? (
                <Text c="dimmed" fs="italic" size="sm" p="md">No activity yet.</Text>
            ) : (
                <Timeline active={localActivities.length} bulletSize={24} lineWidth={1}>
                    {localActivities.map((activity: any) => {
                        const groupedReactions = getGroupedReactions(activity.reactions);
                        const isComment = activity.action === 'Commented';

                        // Robust property access in case of camelCase/PascalCase mismatch
                        const uName = activity.username || activity.Username || "Unknown";
                        const uAvatar = activity.userAvatarUrl || activity.UserAvatarUrl;

                        return (
                            <Timeline.Item
                                key={activity.id}
                                bullet={
                                    <Avatar
                                        size={24}
                                        radius="xl"
                                        src={uAvatar}
                                        alt={uName}
                                    >
                                        {uName.charAt(0).toUpperCase()}
                                    </Avatar>
                                }
                                title={
                                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <Group gap={8} align="center">
                                                <Text size="sm" fw={700} c={computedColorScheme === 'dark' ? 'white' : 'gray.9'}>
                                                    {uName}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {formatDistanceToNow(new Date(activity.timestamp))} ago
                                                </Text>
                                            </Group>
                                        </Box>

                                        {(canEdit(activity) || canDelete(activity)) && editingId !== activity.id && (
                                            <Menu shadow="md" width={160} position="bottom-end" withinPortal zIndex={3000}>
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle" size="sm" color="gray">
                                                        <IconDots size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    {canEdit(activity) && (
                                                        <Menu.Item
                                                            leftSection={<IconPencil size={14} />}
                                                            onClick={() => handleStartEdit(activity)}
                                                        >
                                                            Edit comment
                                                        </Menu.Item>
                                                    )}
                                                    {canDelete(activity) && (
                                                        <>
                                                            {canEdit(activity) && <Menu.Divider />}
                                                            <Menu.Item
                                                                color="red"
                                                                leftSection={<IconTrash size={14} />}
                                                                onClick={() => handleDelete(activity.id)}
                                                            >
                                                                Delete comment
                                                            </Menu.Item>
                                                        </>
                                                    )}
                                                </Menu.Dropdown>
                                            </Menu>
                                        )}
                                    </Group>
                                }
                            >
                                {editingId === activity.id ? (
                                    <Stack gap="xs" mt={4}>
                                        <TextInput
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.currentTarget.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit();
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            autoFocus
                                        />
                                        <Group gap="xs">
                                            <Button size="xs" onClick={handleSaveEdit} loading={isSaving} leftSection={<IconCheck size={12} />}>Save</Button>
                                            <Button size="xs" variant="default" onClick={() => setEditingId(null)} leftSection={<IconX size={12} />}>Cancel</Button>
                                        </Group>
                                    </Stack>
                                ) : (
                                    <Box
                                        mt={4}
                                        p={isComment ? '8px 12px' : 0}
                                        style={isComment ? {
                                            background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8f9fa',
                                            borderRadius: '8px',
                                            border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#dee2e6'}`,
                                            width: 'fit-content',
                                            maxWidth: '100%'
                                        } : {}}
                                    >
                                        <Text size="sm" c={isComment ? (computedColorScheme === 'dark' ? 'gray.2' : 'gray.8') : 'dimmed'} className="activity-details">
                                            {!isComment && (
                                                <Text span fw={600} size="xs" c="blue.5" style={{ textTransform: 'uppercase', marginRight: 6 }}>
                                                    {activity.action}
                                                </Text>
                                            )}
                                            {activity.details}
                                        </Text>
                                    </Box>
                                )}

                                {isComment && (
                                    <Group gap={6} mt={4}>
                                        {groupedReactions.map(group => (
                                            <Tooltip
                                                key={group.emoji}
                                                label={group.users.join(', ')}
                                                withArrow
                                                position="top"
                                            >
                                                <Badge
                                                    variant={group.hasReacted ? "filled" : "light"}
                                                    color={group.hasReacted ? "violet" : "gray"}
                                                    size="sm"
                                                    style={{ cursor: 'pointer', textTransform: 'none', padding: '0 6px' }}
                                                    onClick={() => handleReaction(activity.id, group.emoji)}
                                                >
                                                    {group.emoji} {group.count}
                                                </Badge>
                                            </Tooltip>
                                        ))}

                                        <Popover
                                            position="bottom-start"
                                            shadow="lg"
                                            width={350}
                                            trapFocus={false}
                                            withinPortal
                                            opened={openedPickerId === activity.id}
                                            onChange={(opened) => setOpenedPickerId(opened ? activity.id : null)}
                                        >
                                            <Popover.Target>
                                                <ActionIcon
                                                    variant="subtle"
                                                    size="xs"
                                                    color="gray"
                                                    radius="xl"
                                                    title="Add reaction"
                                                    onClick={() => setOpenedPickerId(openedPickerId === activity.id ? null : activity.id)}
                                                >
                                                    <IconPlus size={12} />
                                                </ActionIcon>
                                            </Popover.Target>
                                            <Popover.Dropdown p={0} styles={{ dropdown: { zIndex: 3001, border: 'none', background: 'transparent' } }}>
                                                <EmojiPicker
                                                    theme={computedColorScheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                                                    onEmojiClick={(emojiData) => {
                                                        handleReaction(activity.id, emojiData.emoji);
                                                    }}
                                                    width="100%"
                                                    height={400}
                                                    lazyLoadEmojis={true}
                                                    previewConfig={{ showPreview: false }}
                                                    skinTonesDisabled
                                                />
                                            </Popover.Dropdown>
                                        </Popover>
                                    </Group>
                                )}
                            </Timeline.Item>
                        );
                    })}
                </Timeline>
            )}
        </ScrollArea>
    );
}
