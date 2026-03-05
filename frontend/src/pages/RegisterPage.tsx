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
            localStorage.setItem('user', JSON.stringify({ username: res.username, id: res.userId }));
            notifications.show({ title: 'Account created!', message: `Welcome, ${res.username}`, color: 'green' });
            navigate('/boards');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Username or email already exists or a server error occurred.';
            notifications.show({ title: 'Registration failed', message, color: 'red' });
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
                    Create Account
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                    Already have an account?{' '}
                    <Anchor component={Link} to="/login" size="sm" c="violet">
                        Sign In
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
                            placeholder="Pick a username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.currentTarget.value)}
                        />
                        <TextInput
                            label="Email"
                            placeholder="you@email.com"
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.currentTarget.value)}
                        />
                        <PasswordInput
                            label="Password"
                            placeholder="Min. 6 characters"
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
                            Create Account
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
