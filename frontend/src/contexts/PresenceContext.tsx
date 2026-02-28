import { createContext, useContext, useEffect, useState } from 'react';
import { getOnlineUserIds } from '../api/users';
import { useSignalR } from '../hooks/useSignalR';

interface PresenceContextType {
    onlineUserIds: Set<number>;
}

const PresenceContext = createContext<PresenceContextType>({ onlineUserIds: new Set() });

export const PresenceProvider = ({ children }: { children: React.ReactNode }) => {
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

    // Fetch initial online users and merge to prevent race condition with fast SignalR connects
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        getOnlineUserIds()
            .then((ids: number[]) => setOnlineUserIds(prev => new Set([...prev, ...ids])))
            .catch(console.error);
    }, []);

    // Listen to global UserOnline / UserOffline broadcasts
    useSignalR(null, {
        onUserOnline: (userId) => {
            setOnlineUserIds(prev => {
                const updated = new Set(prev);
                updated.add(userId);
                return updated;
            });
        },
        onUserOffline: (userId) => {
            setOnlineUserIds(prev => {
                const updated = new Set(prev);
                updated.delete(userId);
                return updated;
            });
        }
    });

    return (
        <PresenceContext.Provider value={{ onlineUserIds }}>
            {children}
        </PresenceContext.Provider>
    );
};

export const usePresence = () => useContext(PresenceContext);
