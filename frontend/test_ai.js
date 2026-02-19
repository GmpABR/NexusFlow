async function test() {
    try {
        const response = await fetch("https://text.pollinations.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "user", content: "hello" }],
                model: "openai"
            })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
