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
import { registerUser } from '../api/auth';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await registerUser(username, email, password);
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify({ username: res.username, userId: res.userId }));
            notifications.show({ title: 'Account created!', message: `Welcome, ${res.username}`, color: 'green' });
            navigate('/boards');
        } catch {
            notifications.show({ title: 'Registration failed', message: 'Username or email already exists.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'radial-gradient(ellipse at top, #1a0030 0%, #000 60%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Container size={420} w="100%">
                <Title
                    ta="center"
                    fw={800}
                    style={{
                        fontSize: '2rem',
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Create Account
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                    Already have an account?{' '}
                    <Anchor component={Link} to="/login" size="sm">
                        Sign In
                    </Anchor>
                </Text>

                <Paper
                    component="form"
                    onSubmit={handleSubmit}
                    withBorder
                    shadow="xl"
                    p={30}
                    radius="lg"
                    style={{
                        background: 'rgba(26, 27, 30, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderColor: 'rgba(124, 58, 237, 0.2)',
                    }}
                >
                    <Stack>
                        <TextInput
                            label="Username"
                            placeholder="Pick a username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.currentTarget.value)}
                            styles={{ input: { background: 'rgba(0,0,0,0.4)' } }}
                        />
                        <TextInput
                            label="Email"
                            placeholder="you@email.com"
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.currentTarget.value)}
                            styles={{ input: { background: 'rgba(0,0,0,0.4)' } }}
                        />
                        <PasswordInput
                            label="Password"
                            placeholder="Min. 6 characters"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            styles={{ input: { background: 'rgba(0,0,0,0.4)' } }}
                        />
                        <Button
                            type="submit"
                            loading={loading}
                            fullWidth
                            mt="md"
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'indigo' }}
                            size="md"
                            radius="md"
                        >
                            Create Account
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
