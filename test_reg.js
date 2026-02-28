(async () => {
    try {
        const response = await fetch('http://localhost:5145/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser' + Date.now(),
                email: 'test' + Date.now() + '@example.com',
                password: 'Password123!'
            })
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch error:', err);
    }
})();
