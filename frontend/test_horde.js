async function testHorde() {
    try {
        console.log("Initiating request...");
        const response = await fetch("https://stablehorde.net/api/v2/generate/text/async", {
            method: "POST",
            headers: {
                "apikey": "0000000000",
                "Content-Type": "application/json",
                "Client-Agent": "NexusFlow:1.0:Anonymous"
            },
            body: JSON.stringify({
                "prompt": "The following is a professional Scrum task description: 'Fix the login button'. Enhanced version:",
                "params": {
                    "n": 1,
                    "max_context_length": 1024,
                    "max_length": 200,
                    "rep_pen": 1.1,
                    "temperature": 0.7,
                    "top_p": 0.9
                },
                "models": []
            })
        });

        if (!response.ok) {
            console.error("Initiate failed:", response.status, await response.text());
            return;
        }

        const data = await response.json();
        console.log("Generation initiated, ID:", data.id);

        let done = false;
        while (!done) {
            await new Promise(r => setTimeout(r, 2000));
            const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/text/status/${data.id}`, {
                headers: {
                    "Client-Agent": "NexusFlow:1.0:Anonymous"
                }
            });
            const status = await statusResponse.json();
            console.log("Status:", status.done ? "DONE" : "WAITING", "Wait time:", status.wait_time);

            if (status.done) {
                console.log("Result:", status.generations[0].text);
                done = true;
            }
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testHorde();
