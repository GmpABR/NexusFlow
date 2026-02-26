import { Box } from '@mantine/core';

interface OnlineIndicatorProps {
    isOnline: boolean;
    size?: number;
    offset?: number;
}

export function OnlineIndicator({ isOnline, size = 12, offset = 4 }: OnlineIndicatorProps) {
    return (
        <Box
            style={{
                position: 'absolute',
                bottom: offset,
                right: offset,
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: isOnline ? '#40c057' : '#adb5bd', // Green if online, gray if offline
                border: '2px solid var(--mantine-color-body)',
                zIndex: 2,
            }}
        />
    );
}
