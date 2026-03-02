import { Drawer, Stack, Text, Group, ActionIcon, Badge, ScrollArea, Box, Paper, useComputedColorScheme, Skeleton, Center, Button } from '@mantine/core';
import { IconBell, IconCheck, IconChecks, IconMessage, IconUser, IconExternalLink } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { getNotifications, markAsRead, markAllAsRead, type Notification } from '../api/notifications';
import { formatDistanceToNow } from 'date-fns';
// import { ptBR } from 'date-fns/locale'; (Removed Portuguese locale)

interface NotificationDrawerProps {
    opened: boolean;
    onClose: () => void;
    onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationDrawer({ opened, onClose, onNotificationClick }: NotificationDrawerProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const computedColorScheme = useComputedColorScheme('dark');

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (opened) {
            fetchNotifications();
        }
    }, [opened]);

    const handleMarkAsRead = async (id: number) => {
        try {
            await markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'Assignment': return <IconUser size={18} />;
            case 'Mention': return <IconMessage size={18} />;
            default: return <IconBell size={18} />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'Assignment': return 'blue';
            case 'Mention': return 'green';
            default: return 'gray';
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={
                <Group justify="space-between" w="100%" pr="md">
                    <Group gap="xs">
                        <Text fw={700} size="lg">Notifications</Text>
                        {unreadCount > 0 && (
                            <Badge color="red" variant="filled" size="sm">
                                {unreadCount}
                            </Badge>
                        )}
                    </Group>
                </Group>
            }
            position="right"
            size="md"
            padding="md"
            zIndex={2000}
            styles={{
                header: {
                    borderBottom: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                    marginBottom: 0,
                    paddingBottom: 'var(--mantine-spacing-md)',
                },
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Group justify="flex-end" py="xs">
                    <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconChecks size={14} />}
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        Mark all as read
                    </Button>
                </Group>

                <ScrollArea scrollbars="y" style={{ flex: 1 }} mx="-md" px="md">
                    <Stack gap="xs" py="md">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <Skeleton key={i} h={80} radius="md" />
                            ))
                        ) : notifications.length === 0 ? (
                            <Center py={50}>
                                <Stack align="center" gap="xs">
                                    <IconBell size={40} style={{ opacity: 0.2 }} />
                                    <Text c="dimmed" size="sm">No notifications here.</Text>
                                </Stack>
                            </Center>
                        ) : (
                            notifications.map(n => (
                                <Paper
                                    key={n.id}
                                    p="sm"
                                    radius="md"
                                    withBorder
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'transform 0.1s ease, background-color 0.2s ease',
                                        backgroundColor: !n.isRead
                                            ? (computedColorScheme === 'dark' ? 'rgba(76, 110, 245, 0.05)' : 'rgba(76, 110, 245, 0.03)')
                                            : 'transparent',
                                        position: 'relative'
                                    }}
                                    onClick={() => {
                                        if (!n.isRead) handleMarkAsRead(n.id);
                                        if (onNotificationClick) onNotificationClick(n);
                                    }}
                                >
                                    <Group align="flex-start" wrap="nowrap" gap="sm">
                                        <Badge
                                            color={getColor(n.type)}
                                            variant="light"
                                            circle
                                            size="lg"
                                            p={0}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {getIcon(n.type)}
                                        </Badge>
                                        <Box style={{ flex: 1 }}>
                                            <Text size="sm" fw={!n.isRead ? 600 : 400} lh={1.4}>
                                                {n.message}
                                            </Text>
                                            <Group gap="xs" mt={4}>
                                                <Text size="xs" c="dimmed">
                                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                </Text>
                                                {n.relatedId && (
                                                    <Badge
                                                        variant="filled"
                                                        size="xs"
                                                        color="gray"
                                                        leftSection={<IconExternalLink size={10} />}
                                                        style={{
                                                            textTransform: 'none',
                                                            height: 18,
                                                            paddingInline: 6
                                                        }}
                                                    >
                                                        Task #{n.relatedId}
                                                    </Badge>
                                                )}
                                            </Group>
                                        </Box>
                                        {!n.isRead && (
                                            <ActionIcon
                                                variant="subtle"
                                                color="blue"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(n.id);
                                                }}
                                            >
                                                <IconCheck size={14} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                </Paper>
                            ))
                        )}
                    </Stack>
                </ScrollArea>
            </Box>
        </Drawer>
    );
}
