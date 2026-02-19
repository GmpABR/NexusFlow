import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Center, Loader, Text, Group, Stack, Paper, Title,
    Avatar, TextInput, Textarea, Button, ActionIcon, Tooltip, Divider,
    Badge, ThemeIcon, ScrollArea,
} from '@mantine/core';
import {
    IconEdit, IconCheck, IconX, IconUser,
    IconAt, IconCalendar, IconBriefcase, IconBuilding,
    IconMapPin, IconCamera, IconLink, IconUpload,
    IconListCheck, IconLayoutDashboard, IconLogout,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getMe, updateProfile, type UserProfile } from '../api/users';

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

/** Inline editable field row */
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

    return (
        <Box>
            <Text
                size="xs"
                c="dimmed"
                mb={4}
                fw={600}
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
                {label}
            </Text>
            {editing ? (
                <Stack gap={6}>
                    {textarea ? (
                        <Textarea
                            value={draft}
                            onChange={e => setDraft(e.currentTarget.value)}
                            placeholder={placeholder}
                            autosize
                            minRows={2}
                            maxRows={5}
                            autoFocus
                            styles={{ input: { background: '#282e33', borderColor: '#3b4754', color: '#b6c2cf' } }}
                            onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
                        />
                    ) : (
                        <TextInput
                            value={draft}
                            onChange={e => setDraft(e.currentTarget.value)}
                            placeholder={placeholder}
                            autoFocus
                            styles={{ input: { background: '#282e33', borderColor: '#3b4754', color: '#b6c2cf' } }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                        />
                    )}
                    <Group gap={6}>
                        <Button size="xs" color="violet" loading={saving} onClick={handleSave}
                            leftSection={<IconCheck size={12} />}>Save</Button>
                        <Button size="xs" variant="subtle" color="gray"
                            onClick={() => { setDraft(value ?? ''); setEditing(false); }}>Cancel</Button>
                    </Group>
                </Stack>
            ) : (
                <Group justify="space-between" gap={8} style={{ cursor: 'pointer' }}
                    onClick={() => { setDraft(value ?? ''); setEditing(true); }}>
                    <Group gap={8}>
                        <Box style={{ color: '#738496' }}>{icon}</Box>
                        <Text size="sm" c={value ? 'white' : 'dimmed'} fw={value ? 500 : 400}>
                            {value || placeholder}
                        </Text>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" size="xs" opacity={0.5}>
                        <IconEdit size={12} />
                    </ActionIcon>
                </Group>
            )}
        </Box>
    );
}

export default function ProfilePage() {
    const navigate = useNavigate();
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
            })
            .catch(() => notifications.show({ title: 'Error', message: 'Failed to load profile.', color: 'red' }))
            .finally(() => setLoading(false));
    }, []);

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
            await save({ avatarUrl: avatarUrlDraft.trim() || undefined });
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
            <Center style={{ minHeight: '100vh', background: '#1d2125' }}>
                <Loader color="violet" size="lg" />
            </Center>
        );
    }

    const currentAvatar = avatarMode !== 'none' ? avatarPreview : (profile?.avatarUrl ?? '');

    return (
        <Box style={{ minHeight: '100vh', background: '#1d2125', color: '#b6c2cf', display: 'flex', flexDirection: 'column' }}>

            {/* ── Two-column layout ── */}

            <Box
                style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '280px 1fr',
                    gap: 0,
                    maxWidth: 1100,
                    margin: '0 auto',
                    width: '100%',
                    padding: '32px 24px',
                    alignItems: 'start',
                }}
            >
                {/* ── LEFT SIDEBAR ── */}
                <Box style={{ position: 'sticky', top: 64 }}>
                    <Stack gap="lg" align="center">
                        {/* Avatar */}
                        <Box style={{ position: 'relative' }}>
                            <Avatar
                                src={currentAvatar || undefined}
                                size={120}
                                radius={120}
                                color="violet"
                                style={{ border: '3px solid #3b4754', fontSize: 32 }}
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
                                    styles={{ input: { background: '#282e33', borderColor: '#3b4754', color: '#b6c2cf' } }}
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

                        <Divider w="100%" color="#2c333a" />

                        {/* Username display */}
                        <Stack gap={2} align="center" style={{ width: '100%' }}>
                            <Text fw={700} size="lg" c="white">{profile?.username}</Text>
                            <Text size="xs" c="dimmed">{profile?.email}</Text>
                            {profile?.jobTitle && <Text size="xs" c="dimmed">{profile.jobTitle}</Text>}
                        </Stack>

                        <Divider w="100%" color="#2c333a" />

                        {/* Quick nav */}
                        <Stack gap={4} style={{ width: '100%' }}>
                            <Button
                                variant="subtle" color="gray" justify="flex-start" size="sm" fullWidth
                                leftSection={<IconListCheck size={16} />}
                                onClick={() => navigate('/my-tasks')}
                            >My Tasks</Button>
                            <Button
                                variant="subtle" color="gray" justify="flex-start" size="sm" fullWidth
                                leftSection={<IconLayoutDashboard size={16} />}
                                onClick={() => navigate('/boards')}
                            >My Boards</Button>
                            <Button
                                variant="subtle" color="red" justify="flex-start" size="sm" fullWidth
                                leftSection={<IconLogout size={16} />}
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('user');
                                    navigate('/login');
                                }}
                            >Sign Out</Button>
                        </Stack>
                    </Stack>
                </Box>

                {/* ── RIGHT CONTENT ── */}
                <ScrollArea style={{ paddingLeft: 32 }}>
                    <Stack gap="lg">

                        {/* ── About You ── */}
                        <Paper
                            p="xl"
                            radius="md"
                            style={{ background: '#282e33', border: '1px solid #2c333a' }}
                        >
                            <Title order={5} c="white" mb="lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ThemeIcon size="sm" variant="light" color="violet"><IconUser size={13} /></ThemeIcon>
                                About you
                            </Title>

                            <Stack gap="lg">
                                <EditableField
                                    label="Full name"
                                    icon={<IconUser size={15} />}
                                    value={profile?.fullName}
                                    placeholder="Add your full name"
                                    onSave={async v => { const u = await save({ fullName: v }); setProfile(u); }}
                                />
                                <Divider color="#2c333a" />
                                <EditableField
                                    label="Job title"
                                    icon={<IconBriefcase size={15} />}
                                    value={profile?.jobTitle}
                                    placeholder="Add your job title"
                                    onSave={async v => { const u = await save({ jobTitle: v }); setProfile(u); }}
                                />
                                <Divider color="#2c333a" />
                                <EditableField
                                    label="Department"
                                    icon={<IconBuilding size={15} />}
                                    value={profile?.department}
                                    placeholder="Add your department"
                                    onSave={async v => { const u = await save({ department: v }); setProfile(u); }}
                                />
                                <Divider color="#2c333a" />
                                <EditableField
                                    label="Organization"
                                    icon={<IconBuilding size={15} />}
                                    value={profile?.organization}
                                    placeholder="Add your organization"
                                    onSave={async v => { const u = await save({ organization: v }); setProfile(u); }}
                                />
                                <Divider color="#2c333a" />
                                <EditableField
                                    label="Based in"
                                    icon={<IconMapPin size={15} />}
                                    value={profile?.location}
                                    placeholder="Add your location"
                                    onSave={async v => { const u = await save({ location: v }); setProfile(u); }}
                                />
                                <Divider color="#2c333a" />
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
                            radius="md"
                            style={{ background: '#282e33', border: '1px solid #2c333a' }}
                        >
                            <Title order={5} c="white" mb="lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ThemeIcon size="sm" variant="light" color="violet"><IconAt size={13} /></ThemeIcon>
                                Account
                            </Title>

                            <Stack gap="md">
                                {/* Username */}
                                <Box>
                                    <Text size="xs" c="dimmed" mb={4} fw={600}
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
                                                styles={{ input: { background: '#1d2125', borderColor: '#3b4754', color: '#b6c2cf' } }}
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
                                            <Group gap={8}>
                                                <IconUser size={16} color="#738496" />
                                                <Text size="sm" c="white" fw={500}>{profile?.username}</Text>
                                            </Group>
                                            <Tooltip label="Edit username">
                                                <ActionIcon variant="subtle" color="gray" size="sm"
                                                    onClick={() => setEditingUsername(true)}>
                                                    <IconEdit size={14} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    )}
                                </Box>

                                <Divider color="#2c333a" />

                                {/* Email */}
                                <Box>
                                    <Text size="xs" c="dimmed" mb={4} fw={600}
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Email
                                    </Text>
                                    <Group gap={8}>
                                        <IconAt size={16} color="#738496" />
                                        <Text size="sm" c="white" fw={500}>{profile?.email}</Text>
                                        <Badge size="xs" variant="light" color="gray" ml="auto">Read-only</Badge>
                                    </Group>
                                </Box>

                                <Divider color="#2c333a" />

                                {/* Member since */}
                                <Box>
                                    <Text size="xs" c="dimmed" mb={4} fw={600}
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Member Since
                                    </Text>
                                    <Group gap={8}>
                                        <IconCalendar size={16} color="#738496" />
                                        <Text size="sm" c="white" fw={500}>
                                            {profile ? new Date(profile.createdAt).toLocaleDateString('en-GB', {
                                                day: '2-digit', month: 'long', year: 'numeric'
                                            }) : '—'}
                                        </Text>
                                    </Group>
                                </Box>
                            </Stack>
                        </Paper>

                    </Stack>
                </ScrollArea>
            </Box>
        </Box>
    );
}
