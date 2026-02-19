const BASE_URL = 'http://127.0.0.1:5145/api'; // Backend URL
const myFetch = fetch;

async function runTest() {
    console.log("=== Starting Activity Log Verification ===");

    // 1. Register User
    const username = `user_${Date.now()}`;
    const email = `${username}@test.com`;
    const password = 'password123';

    console.log(`[1] Registering user: ${username}`);
    let res = await myFetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });

    if (!res.ok) {
        console.error("Registration failed:", await res.text());
        return;
    }
    const authData = await res.json();
    const token = authData.token;
    console.log("    User registered. Token acquired.");

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 2. Create Board
    console.log("[2] Creating Board...");
    res = await myFetch(`${BASE_URL}/boards`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: "Activity Log Test Board", themeColor: "blue" })
    });
    if (!res.ok) throw new Error("Create Board failed: " + await res.text());
    const board = await res.json();
    console.log(`    Board created: ${board.id}`);

    // 3. Get Board Detail to find Columns
    console.log("[3] Fetching Board Details...");
    res = await myFetch(`${BASE_URL}/boards/${board.id}`, { headers });
    const boardDetail = await res.json();
    const todoCol = boardDetail.columns.find(c => c.name === "To Do");
    const doneCol = boardDetail.columns.find(c => c.name === "Done");

    if (!todoCol || !doneCol) throw new Error("Could not find default columns");
    console.log(`    Columns found: To Do (${todoCol.id}), Done (${doneCol.id})`);

    // 4. Create Task
    console.log("[4] Creating Task...");
    res = await myFetch(`${BASE_URL}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: "Test Task", columnId: todoCol.id, description: "Initial Desc" })
    });

    if (!res.ok) {
        console.error("Create Task failed:", res.status, await res.text());
        return;
    }
    const taskText = await res.text();
    console.log("Create Task Response:", taskText);
    const task = JSON.parse(taskText);
    console.log(`    Task created: ${task.id}`);

    // Verify Log: Created
    await verifyLog(task.id, headers, "Created");

    // 5. Update Task
    console.log("[5] Updating Task...");
    res = await myFetch(`${BASE_URL}/tasks/${task.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ title: "Updated Task Title", description: "New Desc", priority: "High" })
    });
    if (!res.ok) throw new Error("Update failed");
    console.log("    Task updated.");

    // Verify Log: Updated
    await verifyLog(task.id, headers, "Updated");

    // 6. Add Subtask
    console.log("[6] Adding Subtask...");
    res = await myFetch(`${BASE_URL}/tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: "Subtask 1" })
    });
    if (!res.ok) throw new Error("Add subtask failed");
    console.log("    Subtask added.");

    // Verify Log: Subtask Added
    await verifyLog(task.id, headers, "Subtask Added");

    // 7. Move Task
    console.log("[7] Moving Task to Done...");
    res = await myFetch(`${BASE_URL}/tasks/${task.id}/move`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ targetColumnId: doneCol.id, newOrder: 0 })
    });
    if (!res.ok) throw new Error("Move failed");
    console.log("    Task moved.");

    // Verify Log: Moved
    await verifyLog(task.id, headers, "Moved");

    console.log("=== Verification Completed Successfully ===");
}

async function verifyLog(taskId, headers, expectedAction) {
    const res = await myFetch(`${BASE_URL}/tasks/${taskId}/activities`, { headers });
    const activities = await res.json();

    const found = activities.find(a => a.action === expectedAction);
    if (found) {
        console.log(`    [PASS] Found log: ${found.action} - ${found.details}`);
    } else {
        console.error(`    [FAIL] Expected '${expectedAction}' log not found. Available logs:`, activities.map(a => a.action));
        throw new Error(`Log verification failed for ${expectedAction}`);
    }
}

runTest().catch(console.error);
