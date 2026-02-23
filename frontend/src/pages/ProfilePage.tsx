import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Center, Loader, Text, Group, Stack, Paper, Title, Flex, NavLink,
    Avatar, TextInput, Textarea, Button, ActionIcon, Tooltip, Divider,
    Badge, ThemeIcon,
} from '@mantine/core';
import {
    IconEdit, IconCheck, IconX, IconUser, IconHome, IconSettings,
    IconAt, IconCalendar, IconBriefcase, IconBuilding,
    IconMapPin, IconCamera, IconLink, IconUpload,
    IconLogout, IconSun, IconMoon, IconPalette
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMantineColorScheme, useComputedColorScheme, SegmentedControl, Center as MantineCenter } from '@mantine/core';
import { getMe, updateProfile, type UserProfile } from '../api/users';

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function EditableField({
    label,
    icon,
    value,
    placeholder,
    onSave,
    textarea,
}: {
    label: string;
    icon: React.ReactNode;
    value: string | null | undefined;
    placeholder: string;
    onSave: (v: string) => Promise<void>;
    textarea?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value ?? '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(draft.trim());
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const computedColorScheme = useComputedColorScheme('dark');

    return (
        <Box>
            <Text
                size="xs"
                c="dimmed"
                mb={6}
                fw={600}
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
                {label}
            </Text>
            {editing ? (
                <Stack gap={8}>
                    {textarea ? (
                        <Textarea
                            value={draft}
                            onChange={e => setDraft(e.currentTarget.value)}
                            placeholder={placeholder}
                            autosize
                            minRows={2}
                            maxRows={5}
                            autoFocus
                            styles={{
                                input: {
                                    background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                    borderColor: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                    color: computedColorScheme === 'dark' ? 'white' : 'black'
                                }
                            }}
                            onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
                        />
                    ) : (
                        <TextInput
                            value={draft}
                            onChange={e => setDraft(e.currentTarget.value)}
                            placeholder={placeholder}
                            autoFocus
                            styles={{
                                input: {
                                    background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                    borderColor: computedColorScheme === 'dark' ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,0.1)',
                                    color: computedColorScheme === 'dark' ? 'white' : 'black'
                                }
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                        />
                    )}
                    <Group gap={8}>
                        <Button size="xs" color="violet" loading={saving} onClick={handleSave}
                            leftSection={<IconCheck size={12} />}>Save</Button>
                        <Button size="xs" variant="subtle" color="gray"
                            onClick={() => { setDraft(value ?? ''); setEditing(false); }}>Cancel</Button>
                    </Group>
                </Stack>
            ) : (
                <Group justify="space-between" gap={8} style={{ cursor: 'pointer' }}
                    onClick={() => { setDraft(value ?? ''); setEditing(true); }}>
                    <Group gap={12}>
                        <Box style={{ color: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', display: 'flex' }}>{icon}</Box>
                        <Text size="sm" c={value ? (computedColorScheme === 'dark' ? 'white' : 'dark') : 'dimmed'} fw={value ? 500 : 400}>
                            {value || placeholder}
                        </Text>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" size="sm" opacity={0.5}>
                        <IconEdit size={16} />
                    </ActionIcon>
                </Group>
            )}
        </Box>
    );
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('dark');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Avatar editing state
    const [avatarMode, setAvatarMode] = useState<'none' | 'url' | 'file'>('none');
    const [avatarUrlDraft, setAvatarUrlDraft] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const [savingAvatar, setSavingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Username editing state
    const [editingUsername, setEditingUsername] = useState(false);
    const [usernameDraft, setUsernameDraft] = useState('');
    const [savingUsername, setSavingUsername] = useState(false);

    useEffect(() => {
        getMe()
            .then(p => {
                setProfile(p);
                setUsernameDraft(p.username);
                setAvatarUrlDraft(p.avatarUrl ?? '');
                setAvatarPreview(p.avatarUrl ?? '');

                // Set initial theme if different from default
                // Only if p.themePreference exists and is different from computed (initial)
                if ((p.themePreference === 'light' || p.themePreference === 'dark') && p.themePreference !== computedColorScheme) {
                    setColorScheme(p.themePreference as 'light' | 'dark');
                }

                // Sync localStorage with fresh profile data
                localStorage.setItem('user', JSON.stringify(p));
            })
            .catch(() => notifications.show({ title: 'Error', message: 'Failed to load profile.', color: 'red' }))
            .finally(() => setLoading(false));
    }, []); // Empty dependency array as getMe and initial setup should run once

    // Shared save helper
    const save = async (updates: Parameters<typeof updateProfile>[0]) => {
        const updated = await updateProfile(updates);
        setProfile(updated);
        return updated;
    };

    // ---------- Avatar handlers ----------
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            notifications.show({ title: 'File too large', message: 'Max 2 MB.', color: 'orange' });
            return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
            const dataUrl = ev.target?.result as string;
            setAvatarPreview(dataUrl);
            setAvatarUrlDraft(dataUrl);
            setAvatarMode('file');
        };
        reader.readAsDataURL(file);
    };

    const saveAvatar = async () => {
        setSavingAvatar(true);
        try {
            const updated = await save({ avatarUrl: avatarUrlDraft.trim() || undefined });
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.avatarUrl = updated.avatarUrl;
                localStorage.setItem('user', JSON.stringify(parsed));
                window.dispatchEvent(new Event('profile-updated'));
            }
            notifications.show({ title: 'Avatar updated!', message: 'Profile picture saved.', color: 'green' });
            setAvatarMode('none');
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to update avatar.', color: 'red' });
        } finally {
            setSavingAvatar(false);
        }
    };

    const cancelAvatar = () => {
        setAvatarMode('none');
        setAvatarUrlDraft(profile?.avatarUrl ?? '');
        setAvatarPreview(profile?.avatarUrl ?? '');
    };

    // ---------- Username handler ----------
    const saveUsername = async () => {
        if (!usernameDraft.trim() || usernameDraft === profile?.username) { setEditingUsername(false); return; }
        setSavingUsername(true);
        try {
            const updated = await save({ username: usernameDraft.trim() });
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.username = updated.username;
                localStorage.setItem('user', JSON.stringify(parsed));
            }
            notifications.show({ title: 'Username updated!', message: `Now "${updated.username}".`, color: 'green' });
            setEditingUsername(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.';
            notifications.show({ title: 'Error', message: msg, color: 'red' });
        } finally {
            setSavingUsername(false);
        }
    };

    if (loading) {
        return (
            <Center style={{ minHeight: '100%', background: computedColorScheme === 'dark' ? '#1d2125' : '#f8f9fa' }}>
                <Loader color="violet" size="lg" />
            </Center>
        );
    }

    const currentAvatar = avatarMode !== 'none' ? avatarPreview : (profile?.avatarUrl ?? '');

    return (
        <Box
            style={{
                minHeight: '100%',
                color: computedColorScheme === 'dark' ? 'white' : 'black',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Flex align="stretch" style={{ flex: 1 }}>

                {/* ── LEFT SIDEBAR ── */}
                <Box
                    style={{
                        width: 280,
                        flexShrink: 0,
                        background: computedColorScheme === 'dark' ? '#121214' : 'white',
                        borderRight: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                        padding: '40px 24px',
                        minHeight: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'sticky',
                        top: 0
                    }}
                >
                    <Stack gap="lg" align="center" mb="xl">
                        {/* Avatar */}
                        <Box style={{ position: 'relative' }}>
                            <Avatar
                                src={currentAvatar || undefined}
                                size={120}
                                radius={120}
                                color="violet"
                                style={{ border: `3px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, fontSize: 32 }}
                            >
                                {getInitials(profile?.username ?? 'U')}
                            </Avatar>
                            {/* Edit overlay */}
                            <Box
                                style={{
                                    position: 'absolute', inset: 0,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.55)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    cursor: 'pointer',
                                }}
                                className="avatar-overlay"
                                onClick={() => setAvatarMode(m => m === 'none' ? 'url' : 'none')}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                            >
                                <IconCamera size={28} color="white" />
                            </Box>
                        </Box>

                        {/* Avatar controls */}
                        {avatarMode === 'none' && (
                            <Group gap={6}>
                                <Tooltip label="Upload from PC">
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        color="gray"
                                        style={{ borderColor: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                        leftSection={<IconUpload size={13} />}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Upload
                                    </Button>
                                </Tooltip>
                                <Tooltip label="Paste image URL">
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        color="gray"
                                        style={{ borderColor: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                                        leftSection={<IconLink size={13} />}
                                        onClick={() => setAvatarMode('url')}
                                    >
                                        URL
                                    </Button>
                                </Tooltip>
                            </Group>
                        )}

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />

                        {/* URL paste panel */}
                        {avatarMode === 'url' && (
                            <Stack gap={6} style={{ width: '100%' }}>
                                <TextInput
                                    placeholder="https://example.com/avatar.jpg"
                                    leftSection={<IconLink size={13} />}
                                    value={avatarUrlDraft}
                                    onChange={e => {
                                        setAvatarUrlDraft(e.currentTarget.value);
                                        setAvatarPreview(e.currentTarget.value);
                                    }}
                                    size="xs"
                                    autoFocus
                                    styles={{ input: { background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: computedColorScheme === 'dark' ? 'white' : 'black' } }}
                                />
                                <Group gap={6}>
                                    <Button size="xs" color="violet" loading={savingAvatar} onClick={saveAvatar}>Save</Button>
                                    <Button size="xs" variant="subtle" color="gray" onClick={cancelAvatar}>Cancel</Button>
                                </Group>
                            </Stack>
                        )}

                        {/* File selected — save bar */}
                        {avatarMode === 'file' && (
                            <Stack gap={6} align="center">
                                <Text size="xs" c="dimmed">Ready to save</Text>
                                <Group gap={6}>
                                    <Button size="xs" color="violet" loading={savingAvatar} onClick={saveAvatar}>
                                        Save photo
                                    </Button>
                                    <Button size="xs" variant="subtle" color="gray" onClick={cancelAvatar}>Cancel</Button>
                                </Group>
                            </Stack>
                        )}

                        <Divider w="100%" color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />

                        {/* Username display */}
                        <Stack gap={2} align="center" style={{ width: '100%' }}>
                            <Text fw={700} size="lg" c={computedColorScheme === 'dark' ? 'white' : 'dark'}>{profile?.username}</Text>
                            <Text size="xs" c="dimmed">{profile?.email}</Text>
                            {profile?.jobTitle && <Text size="xs" c="dimmed">{profile.jobTitle}</Text>}
                        </Stack>
                    </Stack>

                    <Divider w="100%" mb="xl" color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />

                    {/* Quick nav matching BoardsPage style */}
                    <Stack gap={10}>
                        <NavLink
                            label="Overview"
                            leftSection={<IconHome size={20} />}
                            style={{ borderRadius: 8, fontWeight: 600, fontSize: '15px' }}
                            onClick={() => navigate('/boards')}
                        />
                        <NavLink
                            label="Settings"
                            leftSection={<IconSettings size={20} />}
                            active
                            variant="light"
                            color="violet"
                            style={{ borderRadius: 8, fontWeight: 700, fontSize: '15px' }}
                            onClick={() => navigate('/profile')}
                        />
                    </Stack>

                    <Button
                        variant="subtle" color="red" justify="flex-start" size="sm" fullWidth
                        leftSection={<IconLogout size={16} />}
                        mt="auto"
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            navigate('/login');
                        }}
                    >
                        Sign Out
                    </Button>
                </Box>

                {/* ── RIGHT CONTENT (FULL WIDTH LAYOUT) ── */}
                <Box style={{ flex: 1, padding: '40px 60px', maxWidth: '1400px', margin: '0 auto' }}>
                    <Stack gap="xl">

                        {/* ── About You ── */}
                        <Paper
                            p="xl"
                            radius="xl"
                            style={{
                                background: computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'white',
                                border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                boxShadow: computedColorScheme === 'dark' ? '0 8px 32px rgba(0,0,0,0.1)' : '0 8px 32px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Title order={4} c={computedColorScheme === 'dark' ? 'white' : 'dark'} mb="xl" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <ThemeIcon size="md" variant="light" color="violet" radius="md"><IconUser size={16} /></ThemeIcon>
                                About you
                            </Title>

                            <Stack gap="lg">
                                <EditableField
                                    label="Full name"
                                    icon={<IconUser size={15} />}
                                    value={profile?.fullName}
                                    placeholder="Add your full name"
                                    onSave={async v => {
                                        const u = await save({ fullName: v });
                                        setProfile(u);
                                        const stored = localStorage.getItem('user');
                                        if (stored) {
                                            const parsed = JSON.parse(stored);
                                            parsed.fullName = u.fullName;
                                            localStorage.setItem('user', JSON.stringify(parsed));
                                            window.dispatchEvent(new Event('profile-updated'));
                                        }
                                    }}
                                />
                                <Divider color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                <EditableField
                                    label="Job title"
                                    icon={<IconBriefcase size={15} />}
                                    value={profile?.jobTitle}
                                    placeholder="Add your job title"
                                    onSave={async v => { const u = await save({ jobTitle: v }); setProfile(u); }}
                                />
                                <Divider color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                <EditableField
                                    label="Department"
                                    icon={<IconBuilding size={15} />}
                                    value={profile?.department}
                                    placeholder="Add your department"
                                    onSave={async v => { const u = await save({ department: v }); setProfile(u); }}
                                />
                                <Divider color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                <EditableField
                                    label="Organization"
                                    icon={<IconBuilding size={15} />}
                                    value={profile?.organization}
                                    placeholder="Add your organization"
                                    onSave={async v => { const u = await save({ organization: v }); setProfile(u); }}
                                />
                                <Divider color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                <EditableField
                                    label="Based in"
                                    icon={<IconMapPin size={15} />}
                                    value={profile?.location}
                                    placeholder="Add your location"
                                    onSave={async v => { const u = await save({ location: v }); setProfile(u); }}
                                />
                                <Divider color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                                <EditableField
                                    label="Bio"
                                    icon={<IconUser size={15} />}
                                    value={profile?.bio}
                                    placeholder="Tell the team something about yourself…"
                                    textarea
                                    onSave={async v => { const u = await save({ bio: v }); setProfile(u); }}
                                />
                            </Stack>
                        </Paper>

                        {/* ── Account ── */}
                        <Paper
                            p="xl"
                            radius="xl"
                            style={{
                                background: computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'white',
                                border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                boxShadow: computedColorScheme === 'dark' ? '0 8px 32px rgba(0,0,0,0.1)' : '0 8px 32px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Title order={4} c={computedColorScheme === 'dark' ? 'white' : 'dark'} mb="xl" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <ThemeIcon size="md" variant="light" color="violet" radius="md"><IconAt size={16} /></ThemeIcon>
                                Account Settings
                            </Title>

                            <Stack gap="md">
                                {/* Username */}
                                <Box>
                                    <Text size="xs" c="dimmed" mb={8} fw={600}
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Username
                                    </Text>
                                    {editingUsername ? (
                                        <Group gap="xs">
                                            <TextInput
                                                value={usernameDraft}
                                                onChange={e => setUsernameDraft(e.currentTarget.value)}
                                                size="sm"
                                                style={{ flex: 1 }}
                                                styles={{
                                                    input: {
                                                        background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                        borderColor: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                        color: computedColorScheme === 'dark' ? 'white' : 'black'
                                                    }
                                                }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') saveUsername();
                                                    if (e.key === 'Escape') { setEditingUsername(false); setUsernameDraft(profile?.username ?? ''); }
                                                }}
                                                autoFocus
                                            />
                                            <ActionIcon color="violet" variant="filled" size="sm" loading={savingUsername} onClick={saveUsername}>
                                                <IconCheck size={14} />
                                            </ActionIcon>
                                            <ActionIcon color="gray" variant="subtle" size="sm"
                                                onClick={() => { setEditingUsername(false); setUsernameDraft(profile?.username ?? ''); }}>
                                                <IconX size={14} />
                                            </ActionIcon>
                                        </Group>
                                    ) : (
                                        <Group justify="space-between">
                                            <Group gap={12}>
                                                <IconUser size={18} color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                                                <Text size="sm" c={computedColorScheme === 'dark' ? 'white' : 'dark'} fw={500}>{profile?.username}</Text>
                                            </Group>
                                            <Tooltip label="Edit username">
                                                <ActionIcon variant="subtle" color="gray" size="sm"
                                                    onClick={() => setEditingUsername(true)}>
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    )}
                                </Box>

                                <Divider color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />

                                {/* Email */}
                                <Box>
                                    <Text size="xs" c="dimmed" mb={8} fw={600}
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Email
                                    </Text>
                                    <Group gap={12}>
                                        <IconAt size={18} color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                                        <Text size="sm" c={computedColorScheme === 'dark' ? 'white' : 'dark'} fw={500}>{profile?.email}</Text>
                                        <Badge size="xs" variant="light" color="gray" ml="auto">Read-only</Badge>
                                    </Group>
                                </Box>

                                <Divider color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />

                                {/* Member since */}
                                <Box>
                                    <Text size="xs" c="dimmed" mb={8} fw={600}
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Member Since
                                    </Text>
                                    <Group gap={12}>
                                        <IconCalendar size={18} color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                                        <Text size="sm" c={computedColorScheme === 'dark' ? 'white' : 'dark'} fw={500}>
                                            {profile ? new Date(profile.createdAt).toLocaleDateString('en-GB', {
                                                day: '2-digit', month: 'long', year: 'numeric'
                                            }) : '—'}
                                        </Text>
                                    </Group>
                                </Box>
                            </Stack>
                        </Paper>

                        {/* ── Appearance ── */}
                        <Paper
                            p="xl"
                            radius="xl"
                            style={{
                                background: computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'white',
                                border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                boxShadow: computedColorScheme === 'dark' ? '0 8px 32px rgba(0,0,0,0.1)' : '0 8px 32px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Title order={4} c={computedColorScheme === 'dark' ? 'white' : 'dark'} mb="xl" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <ThemeIcon size="md" variant="light" color="violet" radius="md"><IconPalette size={16} /></ThemeIcon>
                                Appearance
                            </Title>

                            <Stack gap="md">
                                <Box>
                                    <Text size="xs" c="dimmed" mb={12} fw={600}
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Interface Theme
                                    </Text>
                                    <SegmentedControl
                                        value={computedColorScheme}
                                        onChange={async (value) => {
                                            setColorScheme(value as 'light' | 'dark');
                                            try {
                                                await save({ themePreference: value });
                                            } catch {
                                                notifications.show({ title: 'Error', message: 'Failed to save theme preference.', color: 'red' });
                                            }
                                        }}
                                        data={[
                                            {
                                                value: 'light',
                                                label: (
                                                    <MantineCenter style={{ gap: 10 }}>
                                                        <IconSun size={16} />
                                                        <span>Light</span>
                                                    </MantineCenter>
                                                ),
                                            },
                                            {
                                                value: 'dark',
                                                label: (
                                                    <MantineCenter style={{ gap: 10 }}>
                                                        <IconMoon size={16} />
                                                        <span>Dark</span>
                                                    </MantineCenter>
                                                ),
                                            },
                                        ]}
                                        fullWidth
                                        color="violet"
                                        radius="md"
                                        styles={{
                                            root: { background: computedColorScheme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f1f3f5' },
                                            indicator: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                                        }}
                                    />
                                </Box>
                            </Stack>
                        </Paper>

                    </Stack>
                </Box>
            </Flex>
        </Box>
    );
}
