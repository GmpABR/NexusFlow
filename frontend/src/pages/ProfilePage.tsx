import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Center, Loader, Text, Group, Stack, Paper, Title, Flex, NavLink,
    Avatar, TextInput, Textarea, Button, ActionIcon, Tooltip, Divider,
    Badge, ThemeIcon, Switch,
} from '@mantine/core';
import {
    IconEdit, IconCheck, IconX, IconUser, IconHome, IconSettings,
    IconAt, IconCalendar, IconBriefcase, IconBuilding,
    IconMapPin, IconCamera, IconLink, IconUpload,
    IconLogout, IconSun, IconMoon, IconPalette, IconSparkles, IconInfoCircle, IconEyeOff
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMantineColorScheme, useComputedColorScheme, SegmentedControl, Center as MantineCenter } from '@mantine/core';
import { validateApiKey } from '../api/ai';
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
        } catch (e: any) {
            console.error("Save failure:", e);
            notifications.show({
                title: 'Save Failed',
                message: e.message || 'An error occurred while saving.',
                color: 'red',
                autoClose: 5000
            });
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

    const location = useLocation();

    useEffect(() => {
        if (location.hash === '#ai-configuration') {
            const element = document.getElementById('ai-configuration');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
                // Optional: flash the border or background to highlight
                element.style.outline = '2px solid #22b8cf';
                element.style.outlineOffset = '4px';
                setTimeout(() => {
                    const el = document.getElementById('ai-configuration');
                    if (el) el.style.outline = 'none';
                }, 3000);
            }
        }
    }, [location]);

    const handleValidateKey = async (key: string): Promise<boolean> => {
        if (!key || key.length < 10) return false;
        notifications.show({ id: 'validating-key', title: 'Validating Key', message: 'Checking OpenRouter connection...', loading: true, autoClose: false });
        try {
            const isValid = await validateApiKey(key);
            if (isValid) {
                notifications.update({ id: 'validating-key', title: 'Key Valid!', message: 'Your API key is working correctly.', color: 'green', loading: false, autoClose: 3000 });
                return true;
            } else {
                notifications.update({ id: 'validating-key', title: 'Validation Failed', message: 'Invalid key or connection issue. Please check your key.', color: 'red', loading: false, autoClose: 4000 });
                return false;
            }
        } catch (e) {
            notifications.update({ id: 'validating-key', title: 'Validation Error', message: 'Failed to connect to AI provider.', color: 'red', loading: false, autoClose: 4000 });
            return false;
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

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
                        onClick={handleLogout}
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

                                <Divider color={computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />

                                <Group justify="space-between" wrap="nowrap">
                                    <Box>
                                        <Text size="sm" fw={600} c={computedColorScheme === 'dark' ? 'white' : 'dark'} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <IconEyeOff size={16} color={computedColorScheme === 'dark' ? '#b6c2cf' : '#495057'} />
                                            Appear Offline Always
                                        </Text>
                                        <Text size="xs" c="dimmed" mt={2}>
                                            Hide your online status from all team members.
                                        </Text>
                                    </Box>
                                    <Switch
                                        color="violet"
                                        checked={profile?.displayOfflineAlways || false}
                                        onChange={async (event) => {
                                            const isChecked = event.currentTarget.checked;
                                            // Optimistic update
                                            if (profile) setProfile({ ...profile, displayOfflineAlways: isChecked });
                                            try {
                                                const u = await save({ displayOfflineAlways: isChecked });
                                                const stored = localStorage.getItem('user');
                                                if (stored) {
                                                    const parsed = JSON.parse(stored);
                                                    parsed.displayOfflineAlways = u.displayOfflineAlways;
                                                    localStorage.setItem('user', JSON.stringify(parsed));
                                                    window.dispatchEvent(new Event('profile-updated'));
                                                }
                                                // Event is fired across SignalR so we don't need local notifs here really, but good for feedback
                                                notifications.show({ title: 'Privacy Settings Updated', message: isChecked ? 'You now appear offline.' : 'You appear online when active.', color: 'green' });
                                            } catch {
                                                if (profile) setProfile({ ...profile, displayOfflineAlways: !isChecked }); // Revert
                                                notifications.show({ title: 'Error', message: 'Failed to update privacy setting.', color: 'red' });
                                            }
                                        }}
                                    />
                                </Group>
                            </Stack>
                        </Paper>

                        {/* ── AI Configuration ── */}
                        <Paper
                            id="ai-configuration"
                            p="xl"
                            radius="xl"
                            style={{
                                background: computedColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'white',
                                border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                boxShadow: computedColorScheme === 'dark' ? '0 8px 32px rgba(0,0,0,0.1)' : '0 8px 32px rgba(0,0,0,0.05)',
                                transition: 'outline 1s ease'
                            }}
                        >
                            <Title order={4} c={computedColorScheme === 'dark' ? 'white' : 'dark'} mb="xl" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <ThemeIcon size="md" variant="light" color="cyan" radius="md"><IconSparkles size={16} /></ThemeIcon>
                                AI Configuration
                            </Title>

                            <Stack gap="lg">
                                <Box>
                                    <EditableField
                                        label="OpenRouter API Key"
                                        icon={<IconLink size={15} />}
                                        value={profile?.openRouterApiKey ? '••••••••••••••••' : undefined}
                                        placeholder="Paste your sk-or-v1-... key"
                                        onSave={async v => {
                                            // 1. If clearing key, just save
                                            const keyToSave = v?.trim() || '';
                                            if (keyToSave === '') {
                                                const u = await save({ openRouterApiKey: '' });
                                                setProfile(u);
                                                const stored = localStorage.getItem('user');
                                                if (stored) {
                                                    const parsed = JSON.parse(stored);
                                                    parsed.openRouterApiKey = '';
                                                    localStorage.setItem('user', JSON.stringify(parsed));
                                                }
                                                notifications.show({ title: 'AI Key Cleared', message: 'AI features are now disabled.', color: 'gray' });
                                                return;
                                            }

                                            // 2. Validate key
                                            const isValid = await handleValidateKey(keyToSave);
                                            if (!isValid) {
                                                // We throw here so handleSave catches it and stays in edit mode
                                                throw new Error("Validation failed. Please check your OpenRouter API key and try again.");
                                            }

                                            // 3. Save key
                                            const u = await save({ openRouterApiKey: keyToSave });
                                            setProfile(u);
                                            const stored = localStorage.getItem('user');
                                            if (stored) {
                                                const parsed = JSON.parse(stored);
                                                parsed.openRouterApiKey = u.openRouterApiKey;
                                                localStorage.setItem('user', JSON.stringify(parsed));
                                            }
                                            notifications.show({ title: 'AI Key Saved', message: 'Your personal AI key is now active!', color: 'cyan' });
                                        }}
                                    />
                                </Box>

                                <Paper
                                    p="md"
                                    radius="md"
                                    style={{
                                        background: computedColorScheme === 'dark' ? 'rgba(34, 184, 207, 0.05)' : 'rgba(34, 184, 207, 0.05)',
                                        border: `1px dashed ${computedColorScheme === 'dark' ? 'rgba(34, 184, 207, 0.3)' : 'rgba(34, 184, 207, 0.3)'}`
                                    }}
                                >
                                    <Group gap="xs" mb={8}>
                                        <IconInfoCircle size={16} color="#22b8cf" />
                                        <Text size="sm" fw={600} c="cyan">How to get your key:</Text>
                                    </Group>
                                    <Stack gap={4}>
                                        <Text size="xs" opacity={0.8}>1. Go to <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer" style={{ color: '#22b8cf', fontWeight: 600 }}>openrouter.ai/settings/keys</a></Text>
                                        <Text size="xs" opacity={0.8}>2. Click "Create Key" and give it a name like "NexusFlow".</Text>
                                        <Text size="xs" opacity={0.8}>3. Copy the key (starts with <Text span fw={700}>sk-or-v1-</Text>) and paste it above.</Text>
                                        <Text size="xs" opacity={0.8} mt={4}>Personal keys are stored securely and used only for your AI requests.</Text>
                                    </Stack>
                                </Paper>
                            </Stack>
                        </Paper>

                    </Stack>
                </Box>
            </Flex>
        </Box>
    );
}
