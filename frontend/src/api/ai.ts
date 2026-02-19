/**
 * Enhances text using AI Horde with specific modes
 */
export type AIMode = 'enhance' | 'grammar' | 'shorten' | 'professional' | 'custom';

export const enhanceText = async (text: string, mode: AIMode = 'enhance', customInstruction?: string): Promise<string> => {
    const API_KEY = "0000000000"; // Anonymous key
    const CLIENT_AGENT = "NexusFlow:1.0:Anonymous";

    let systemPrompt = "";
    switch (mode) {
        case 'grammar':
            systemPrompt = "Fix all grammar, spelling, and punctuation errors in the following text. Do NOT change the style, tone, or structure. Return only the corrected text.";
            break;
        case 'shorten':
            systemPrompt = "Condense the following text to be concise and to the point. Remove unnecessary words but keep the core meaning. Return only the shortened text.";
            break;
        case 'professional':
            systemPrompt = "Rewrite the following text to sound professional, formal, and business-appropriate. Use sophisticated vocabulary where suitable. Return only the rewritten text.";
            break;
        case 'custom':
            systemPrompt = customInstruction || "Follow the user's instructions exactly.";
            break;
        case 'enhance':
        default:
            systemPrompt = "Improve the clarity, flow, and structure of the following text using Markdown. Maintain the original meaning. Do NOT add new sections or invent details.";
            break;
    }

    try {
        // 1. Initiate Generation Request
        const initiateResponse = await fetch("https://stablehorde.net/api/v2/generate/text/async", {
            method: "POST",
            headers: {
                "apikey": API_KEY,
                "Content-Type": "application/json",
                "Client-Agent": CLIENT_AGENT
            },
            body: JSON.stringify({
                "prompt": `### Instruction:
${systemPrompt}

### Input:
${text}

### Output:
`,
                "params": {
                    "n": 1,
                    "max_context_length": 1024,
                    "max_length": 500,
                    "rep_pen": 1.1,
                    "temperature": mode === 'grammar' ? 0.1 : 0.4, // Low temp for grammar, medium for others
                    "top_p": 0.9
                },
                "models": []
            })
        });

        if (!initiateResponse.ok) {
            throw new Error(`Failed to initiate AI: ${initiateResponse.statusText}`);
        }

        const initialData = await initiateResponse.json();
        const requestId = initialData.id;

        // 2. Poll for Completion
        let attempts = 0;
        const maxAttempts = 30; // 60s timeout

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/text/status/${requestId}`, {
                headers: { "Client-Agent": CLIENT_AGENT }
            });

            if (!statusResponse.ok) continue;

            const status = await statusResponse.json();

            if (status.done) {
                return status.generations[0].text.trim();
            }
        }

        throw new Error("AI Request timed out. system is busy.");

    } catch (error: any) {
        console.error("AI Horde Error:", error);
        throw error;
    }
};
