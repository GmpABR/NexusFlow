import { useState } from 'react';
import {
    TextInput,
    PasswordInput,
    Button,
    Paper,
    Title,
    Text,
    Container,
    Anchor,
    Stack,
    Box,
} from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { loginUser } from '../api/auth';

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await loginUser(username, password);
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify({
                username: res.username,
                userId: res.userId,
                avatarUrl: res.avatarUrl
            }));
            notifications.show({ title: 'Welcome back!', message: `Logged in as ${res.username}`, color: 'green' });
            navigate('/boards');
        } catch {
            notifications.show({ title: 'Login failed', message: 'Invalid username or password.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: '#141517', // Professional dark gray
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Container size={420} w="100%">
                <Title
                    ta="center"
                    fw={800}
                    c="white"
                    style={{ fontSize: '2rem' }}
                >
                    NexusFlow
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                    Don't have an account?{' '}
                    <Anchor component={Link} to="/register" size="sm" c="violet">
                        Register
                    </Anchor>
                </Text>

                <Paper
                    component="form"
                    onSubmit={handleSubmit}
                    withBorder
                    shadow="sm"
                    p={30}
                    radius="md"
                    style={{
                        background: '#25262b', // Lighter dark gray
                        borderColor: '#373A40',
                    }}
                >
                    <Stack>
                        <TextInput
                            label="Username"
                            placeholder="Your username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.currentTarget.value)}
                        />
                        <PasswordInput
                            label="Password"
                            placeholder="Your password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                        />
                        <Button
                            type="submit"
                            loading={loading}
                            fullWidth
                            mt="md"
                            color="violet"
                            size="md"
                            radius="md"
                        >
                            Sign In
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
