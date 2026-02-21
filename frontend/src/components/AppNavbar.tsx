import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Group, Text, TextInput, ActionIcon, Avatar, Menu,
    Tooltip, Kbd, Badge, Stack, Divider,
} from '@mantine/core';
import {
    IconSearch, IconLayoutDashboard, IconListCheck,
    IconUser, IconLogout, IconX,
    IconCalendarEvent, IconCreditCard,
} from '@tabler/icons-react';
import { getMyTasks, type MyTask } from '../api/users';
import { getBoards, getBoardDetail, type BoardSummary, type TaskCard, type Column } from '../api/boards';

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

const PRIORITY_COLOR: Record<string, string> = {
    Urgent: '#f03e3e',
    High: '#f59f00',
    Medium: '#1c7ed6',
    Low: '#37b24d',
};

type ResultKind = 'task' | 'board' | 'card';
interface SearchResult {
    kind: ResultKind;
    id: number;
    boardId?: number;
    title: string;
    subtitle: string;
    priority?: string;
    dueDate?: string | null;
}

export default function AppNavbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const storedUser = JSON.parse(localStorage.getItem('user') ?? '{}');
    const username: string = storedUser?.username ?? 'User';
    const avatarUrl: string = storedUser?.avatarUrl ?? '';

    // Data caches
    const [myTasks, setMyTasks] = useState<MyTask[]>([]);
    const [boards, setBoards] = useState<BoardSummary[]>([]);
    const [boardCards, setBoardCards] = useState<SearchResult[]>([]);
    const cardsFetchedRef = useRef(false);

    // Search state
    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [loadingCards, setLoadingCards] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    // Load tasks + boards on mount
    useEffect(() => {
        getMyTasks().then(setMyTasks).catch(() => { });
        getBoards().then(setBoards).catch(() => { });
    }, []);

    // Lazily fetch all board cards once when user starts searching
    const fetchAllCards = useCallback(async () => {
        if (cardsFetchedRef.current || boards.length === 0) return;
        cardsFetchedRef.current = true;
        setLoadingCards(true);
        try {
            const details = await Promise.allSettled(boards.map(b => getBoardDetail(b.id)));
            const cards: SearchResult[] = [];
            details.forEach((result) => {
                if (result.status !== 'fulfilled') return;
                const detail = result.value;
                detail.columns.forEach((col: Column) => {
                    col.taskCards.forEach((card: TaskCard) => {
                        cards.push({
                            kind: 'card',
                            id: card.id,
                            boardId: detail.id,
                            title: card.title,
                            subtitle: `${detail.name} · ${col.name}`,
                            priority: card.priority,
                            dueDate: card.dueDate,
                        });
                    });
                });
            });
            setBoardCards(cards);
        } finally {
            setLoadingCards(false);
        }
    }, [boards]);

    // Keyboard shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === 'Escape') {
                setSearch('');
                setSearchOpen(false);
                searchRef.current?.blur();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const q = search.trim().toLowerCase();

    // Build results: tasks assigned to me + all board cards + boards
    const results: SearchResult[] = q.length < 1 ? [] : [
        // My tasks
        ...myTasks
            .filter(t => t.title.toLowerCase().includes(q) || t.boardName.toLowerCase().includes(q))
            .map((t): SearchResult => ({
                kind: 'task',
                id: t.id,
                boardId: t.boardId,
                title: t.title,
                subtitle: `${t.boardName} · ${t.columnName}`,
                priority: t.priority,
                dueDate: t.dueDate,
            })),
        // Board cards (deduplicated against my tasks)
        ...boardCards
            .filter(c =>
                !myTasks.some(t => t.id === c.id) && // don't show if already shown as "my task"
                (c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q))
            ),
        // Boards
        ...boards
            .filter(b => b.name.toLowerCase().includes(q))
            .map((b): SearchResult => ({
                kind: 'board',
                id: b.id,
                title: b.name,
                subtitle: 'Board',
            })),
    ].slice(0, 10);

    const handleSignOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleResultClick = (r: SearchResult) => {
        if (r.kind === 'board') navigate(`/boards/${r.id}`);
        else navigate(`/boards/${r.boardId}`);
        setSearch('');
        setSearchOpen(false);
    };

    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <Box
            style={{
                height: 76,
                background: '#1d2125',
                borderBottom: '1px solid #2c333a',
                display: 'flex',
                alignItems: 'center',
                paddingInline: 20,
                gap: 12,
                zIndex: 1000,
                boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
                flexShrink: 0,
            }}
        >
            {/* Logo removed as requested */}
            {/* <Group
                gap={10}
                style={{ cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}
                onClick={() => navigate('/boards')}
            >
                <Box
                    style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'linear-gradient(135deg, #7c6fe0 0%, #4c6ef5 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 14px rgba(124,111,224,0.45)',
                        flexShrink: 0,
                    }}
                >
                    <Text fw={900} size="sm" c="white" style={{ letterSpacing: '-0.5px' }}>N</Text>
                </Box>
                <Text fw={800} size="lg" c="white" style={{ letterSpacing: '-0.4px' }}>
                    NexusFlow
                </Text>
            </Group> */}

            {/* Nav links */}
            <Group gap={4} ml={0} style={{ flexShrink: 0 }}>
                <Tooltip label="My Boards" position="bottom" zIndex={2000}>
                    <ActionIcon
                        variant={isActive('/boards') ? 'filled' : 'subtle'}
                        color={isActive('/boards') ? 'violet' : 'gray'}
                        size="xl"
                        radius="md"
                        onClick={() => navigate('/boards')}
                    >
                        <IconLayoutDashboard size={20} />
                    </ActionIcon>
                </Tooltip>
                <Tooltip label="My Tasks" position="bottom" zIndex={2000}>
                    <ActionIcon
                        variant={isActive('/my-tasks') ? 'filled' : 'subtle'}
                        color={isActive('/my-tasks') ? 'violet' : 'gray'}
                        size="xl"
                        radius="md"
                        onClick={() => navigate('/my-tasks')}
                    >
                        <IconListCheck size={20} />
                    </ActionIcon>
                </Tooltip>
            </Group>

            {/* Global search bar — grows to fill center */}
            <Box style={{ flex: 1, margin: '0 auto', position: 'relative' }}>
                <TextInput
                    ref={searchRef}
                    placeholder="Search tasks, boards, cards…"
                    leftSection={<IconSearch size={20} color="#9fadbc" />}
                    rightSection={
                        search ? (
                            <ActionIcon size="md" variant="subtle" color="gray"
                                onClick={() => { setSearch(''); setSearchOpen(false); }}>
                                <IconX size={16} />
                            </ActionIcon>
                        ) : (
                            <Kbd size="xs" style={{
                                background: '#282e33', color: '#9fadbc',
                                border: '1px solid #3b4754', fontSize: 12, borderRadius: 4, height: 24, display: 'flex', alignItems: 'center'
                            }}>/</Kbd>
                        )
                    }
                    value={search}
                    onChange={e => { setSearch(e.currentTarget.value); setSearchOpen(true); }}
                    onFocus={() => {
                        setSearchOpen(true);
                        fetchAllCards();
                    }}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 160)}
                    size="lg"
                    radius="md"
                    styles={{
                        input: {
                            background: '#282e33',
                            color: '#b6c2cf',
                            border: '1px solid #3b4754',
                            borderRadius: 8,
                            fontSize: 16,
                            height: 50,
                            paddingLeft: 42,
                            '&:focus': { borderColor: '#7c6fe0' },
                            '&::placeholder': { color: '#8c9bab' },
                        },
                        section: { color: '#9fadbc', width: 42 },
                    }}
                />

                {/* Dropdown */}
                {searchOpen && q.length >= 1 && (
                    <Box
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            background: '#21262d',
                            border: '1px solid #30363d',
                            borderRadius: 10,
                            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                            overflow: 'hidden',
                            zIndex: 2000,
                        }}
                    >
                        {results.length === 0 ? (
                            <Box px="md" py={14}>
                                <Text size="sm" c="dimmed" ta="center">
                                    {loadingCards ? 'Loading cards…' : `No results for "${search}"`}
                                </Text>
                            </Box>
                        ) : (
                            <Stack gap={0}>
                                {results.map((r, i) => (
                                    <Box
                                        key={`${r.kind}-${r.id}`}
                                        px="md"
                                        py={9}
                                        style={{
                                            cursor: 'pointer',
                                            borderBottom: i < results.length - 1 ? '1px solid #30363d' : 'none',
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#161b22')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onMouseDown={() => handleResultClick(r)}
                                    >
                                        <Group justify="space-between" gap={8}>
                                            <Group gap={10} style={{ minWidth: 0 }}>
                                                {/* Kind icon */}
                                                <Box style={{ color: r.kind === 'board' ? '#7c6fe0' : '#8b949e', flexShrink: 0 }}>
                                                    {r.kind === 'board'
                                                        ? <IconLayoutDashboard size={14} />
                                                        : <IconCreditCard size={14} />}
                                                </Box>
                                                <Box style={{ minWidth: 0 }}>
                                                    <Text size="sm" c="#e6edf3" fw={500} truncate>{r.title}</Text>
                                                    <Text size="xs" c="#8b949e" truncate>{r.subtitle}</Text>
                                                </Box>
                                            </Group>
                                            <Group gap={8} style={{ flexShrink: 0 }}>
                                                {r.dueDate && (
                                                    <Group gap={3}>
                                                        <IconCalendarEvent size={11} color="#8b949e" />
                                                        <Text size="xs" c="#8b949e">
                                                            {new Date(r.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                        </Text>
                                                    </Group>
                                                )}
                                                {r.priority && (
                                                    <Badge
                                                        size="xs"
                                                        variant="dot"
                                                        color={PRIORITY_COLOR[r.priority] ?? 'gray'}
                                                        style={{ textTransform: 'none', fontSize: 10 }}
                                                    >
                                                        {r.priority}
                                                    </Badge>
                                                )}
                                                {r.kind === 'task' && (
                                                    <Badge size="xs" variant="light" color="violet" style={{ fontSize: 9 }}>
                                                        Assigned to me
                                                    </Badge>
                                                )}
                                            </Group>
                                        </Group>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Box>
                )}
            </Box>

            {/* Right side avatar menu */}
            <Group gap={8} style={{ flexShrink: 0, marginLeft: 'auto' }}>
                <Menu
                    shadow="xl"
                    width={240}
                    position="bottom-end"
                    offset={6}
                    zIndex={2500}
                    transitionProps={{ duration: 100, transition: 'pop-top-right' }}
                    styles={{
                        dropdown: { background: '#21262d', border: '1px solid #30363d', borderRadius: 12 },
                        item: { color: 'white', borderRadius: 6, fontSize: 13, fontWeight: 500 },
                        label: { color: '#909296', fontSize: 11 },
                    }}
                >
                    <Menu.Target>
                        <Group
                            gap={8}
                            style={{
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: 8,
                                border: '1px solid transparent',
                                transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = '#2c333a';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                        >
                            <Avatar
                                src={avatarUrl || undefined}
                                size={34}
                                radius="xl"
                                color="violet"
                                style={{ boxShadow: '0 0 0 1px #30363d' }}
                            >
                                {getInitials(username)}
                            </Avatar>
                        </Group>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Box px="md" py={12}>
                            <Text size="sm" c="white" fw={700} style={{ lineHeight: 1.2 }}>{username}</Text>
                            <Text size="xs" c="#8b949e" mt={2}>NexusFlow account</Text>
                        </Box>
                        <Divider color="#30363d" />
                        <Menu.Item leftSection={<IconUser size={15} />} onClick={() => navigate('/profile')}>
                            Profile
                        </Menu.Item>
                        <Menu.Item leftSection={<IconLayoutDashboard size={15} />} onClick={() => navigate('/boards')}>
                            My Boards
                        </Menu.Item>
                        <Menu.Item leftSection={<IconListCheck size={15} />} onClick={() => navigate('/my-tasks')}>
                            My Tasks
                        </Menu.Item>
                        <Divider color="#30363d" my={4} />
                        <Menu.Item leftSection={<IconLogout size={15} />} color="red" onClick={handleSignOut}>
                            Sign Out
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Box >
    );
}
