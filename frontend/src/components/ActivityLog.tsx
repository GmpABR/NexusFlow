import { Avatar, Text, Timeline, ScrollArea, useComputedColorScheme } from '@mantine/core';
import type { TaskActivity } from '../api/tasks';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogProps {
    activities: TaskActivity[];
}

export default function ActivityLog({ activities }: ActivityLogProps) {
    const computedColorScheme = useComputedColorScheme('dark');
    if (!activities || activities.length === 0) {
        return <Text c="dimmed" fs="italic" size="sm">No activity yet.</Text>;
    }

    return (
        <ScrollArea h={300} type="always" offsetScrollbars>
            <Timeline active={activities.length - 1} bulletSize={24} lineWidth={2}>
                {activities.map((activity) => (
                    <Timeline.Item
                        key={activity.id}
                        bullet={
                            <Avatar
                                size={24}
                                radius="xl"
                                src={activity.user?.avatarUrl}
                                alt={activity.user?.username}
                            >
                                {activity.user?.username?.charAt(0).toUpperCase()}
                            </Avatar>
                        }
                        title={
                            <Text size="sm" fw={500} c={computedColorScheme === 'dark' ? 'white' : 'black'}>
                                {activity.user?.username} <Text span c="dimmed" size="xs">({formatDistanceToNow(new Date(activity.timestamp))} ago)</Text>
                            </Text>
                        }
                    >
                        <Text c="dimmed" size="sm" className="activity-details">
                            <Text span fw={700} c={computedColorScheme === 'dark' ? 'blue.4' : 'blue.7'}>{activity.action}</Text>: {activity.details}
                        </Text>
                    </Timeline.Item>
                ))}
            </Timeline>
        </ScrollArea>
    );
}
