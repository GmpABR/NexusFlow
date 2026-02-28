/**
 * AI Service using OpenRouter API
 * Requires VITE_OPENROUTER_API_KEY in .env
 */

import axios from 'axios';

export const getApiKey = () => {
    // 1. Try to get from localStorage (User's personal key)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (user.openRouterApiKey && user.openRouterApiKey.trim().length > 10) {
                return user.openRouterApiKey.trim();
            }
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
        }
    }

    // 2. No fallback to .env (strictly use user-provided keys)
    return "";
};

export const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key || key.trim().length < 10) return false;

    try {
        const response = await axios.post(
            BASE_URL,
            {
                model: PRIMARY_MODEL,
                messages: [{ role: "user", content: "hi" }],
                max_tokens: 1
            },
            {
                headers: {
                    "Authorization": `Bearer ${key.trim()}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "NexusFlow Key Test"
                },
                timeout: 10000
            }
        );
        return response.status === 200;
    } catch (error: any) {
        console.error("API Key validation failed", error);
        return false;
    }
};
const PRIMARY_MODEL = "stepfun/step-3.5-flash:free";
const FALLBACK_MODEL = "arcee-ai/trinity-large-preview:free";
const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

export type AIMode = 'enhance' | 'grammar' | 'shorten' | 'professional' | 'custom' | 'write_title';

/**
 * Extracts JSON object or array from a string
 */
const extractJSON = (text: string): string => {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || (firstBrace < firstBracket && firstBrace !== -1))) {
        start = firstBrace;
        end = text.lastIndexOf('}');
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = text.lastIndexOf(']');
    }

    if (start === -1 || end === -1 || end < start) return text;
    return text.substring(start, end + 1).trim();
};

/**
 * Executes a request to OpenRouter API with retry/fallback logic
 */
const callOpenRouter = async (prompt: string, isJson: boolean = false, useFallback: boolean = false): Promise<string> => {
    const API_KEY = getApiKey();
    if (!API_KEY || API_KEY.length < 10 || API_KEY.includes('YOUR_')) {
        throw new Error("Missing OpenRouter API Key. Please add your personal key in your Profile settings to enable AI features.");
    }

    const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;

    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "NexusFlow AI Architect"
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const message = errData.error?.message || response.statusText;

            // If primary fails with generic error or auth, try fallback once
            if (!useFallback && (response.status === 402 || response.status === 429 || response.status === 400 || response.status === 401 || response.status === 404)) {
                console.warn(`Primary model ${model} failed (${response.status}: ${message}), trying fallback ${FALLBACK_MODEL}...`);
                return callOpenRouter(prompt, isJson, true);
            }

            throw new Error(`OpenRouter API Error: ${response.status} - ${message}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error("OpenRouter returned an empty response.");
        return text.trim();
    } catch (error: any) {
        if (!useFallback) return callOpenRouter(prompt, isJson, true);
        throw error;
    }
};

export const enhanceText = async (text: string, mode: AIMode = 'enhance', customInstruction?: string): Promise<string> => {
    let systemPrompt = "";
    const cleanRule = "CRITICAL: You are FORBIDDEN from using double asterisks (**) for bolding. Use plain text for headers and simple dashes (-) for lists. Output MUST be clean, professional, and free of markdown bold markers.";

    switch (mode) {
        case 'grammar': systemPrompt = `Fix grammar and spelling. ${cleanRule} Return only corrected text.`; break;
        case 'shorten': systemPrompt = `Condense text while keeping key info. ${cleanRule} Return only shortened text.`; break;
        case 'professional': systemPrompt = `Rewrite professionally. ${cleanRule} Return only rewritten text.`; break;
        case 'custom': systemPrompt = `${customInstruction || "Follow instructions."} ${cleanRule}`; break;
        case 'write_title': systemPrompt = `Write a concise, professional task description based on the provided title. ${cleanRule} Focus on goals and scope.`; break;
        default: systemPrompt = `Improve clarity and structure. ${cleanRule} Return only improved text.`; break;
    }

    const prompt = text.trim()
        ? `${systemPrompt}\n\nText:\n${text}`
        : `Instruction: ${systemPrompt}\n\nTask: Generate professional content based on the instruction above.`;

    return callOpenRouter(prompt);
};

export const generateSubtasks = async (description: string): Promise<string[]> => {
    const prompt = `Break down into 3-7 actionable subtasks. Return ONLY a bulleted list starting with '- '.
Task: ${description}`;
    try {
        const responseText = await callOpenRouter(prompt);
        return responseText.split('\n')
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(line => line.length > 0 && !line.toLowerCase().includes('here are'));
    } catch (error) {
        console.error("Subtask Generation Error:", error);
        throw error;
    }
};

export interface AIBoardStructure {
    columns: string[];
    tasks: { title: string; column: string; description: string; priority: 'Low' | 'Medium' | 'High' }[];
}

export const generateBoardStructure = async (projectIdea: string, projectType: string = 'Kanban'): Promise<AIBoardStructure> => {
    const typeMap: Record<string, string> = {
        'Scrum': "Agile: 'Product Backlog', 'Sprint Backlog', 'In Progress', 'Review/Testing', 'Done'.",
        'Sales/CRM': "Sales: 'Leads', 'Discovery', 'Proposal/Quote', 'Negotiation', 'Closed won'.",
        'Bug Tracking': "QA: 'New Issues', 'Confirmed', 'Fixing', 'Verification/QA', 'Resolved'.",
    };
    const instructions = typeMap[projectType] || "Kanban: 'Backlog', 'To Do', 'In Progress', 'Under Review', 'Done'.";

    const systemPrompt = `Generate a realistic ${projectType} project board in JSON format ONLY.
${instructions}
1. JSON ONLY. No preamble.
2. 6-10 tasks.
3. Every task MUST have a UNIQUE, specific, and detailed description.
4. Populate the FIRST column with all initial tasks.

Format:
{
  "columns": ["Col 1", "Col 2", ...],
  "tasks": [
    { "title": "...", "column": "Col 1", "description": "...", "priority": "Medium" }
  ]
}

Project Idea: ${projectIdea}`;

    try {
        const responseText = await callOpenRouter(systemPrompt, true);
        const jsonText = extractJSON(responseText);
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Board Generation Error:", error);
        throw error;
    }
};

export const generateTasksForColumn = async (columnName: string, existingTasks: string[] = [], projectContext: string = "", extraInstruction: string = ""): Promise<{ title: string; description: string; priority: 'Low' | 'Medium' | 'High' }[]> => {
    const prompt = `Break down the following instruction into 3-5 high-quality, distinct, and actionable tasks for a board column named "${columnName}".

Instruction: ${extraInstruction}
${projectContext ? `Project Context: ${projectContext}` : ""}
${existingTasks.length > 0 ? `DO NOT duplicate these existing tasks: ${existingTasks.join(', ')}` : ""}

CRITICAL REQUIREMENTS:
1. EACH task must have a unique "title" representing a specific part of the breakdown.
2. EACH task MUST have a completely unique, detailed "description" that explains the specific steps to complete THAT EXACT task.
3. DO NOT repeat the original instruction in the descriptions. 
4. DO NOT use the same description for multiple tasks.
5. Ensure descriptions are actionable and technical if appropriate.

Response Format (JSON ONLY):
[{"title": "...", "description": "...", "priority": "Low|Medium|High"}]`;

    try {
        const responseText = await callOpenRouter(prompt, true);
        const jsonText = extractJSON(responseText);
        console.log("Raw generated tasks payload:", jsonText);
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Column Task Error:", error);
        throw error;
    }
};

/**
 * Prompts the AI to generate a PlantUML diagram based on the provided context.
 */
export const generateErDiagram = async (context: string, diagramType: string = 'Entity-Relationship (ER)'): Promise<string> => {
    const prompt = `Generate a PlantUML ${diagramType} diagram for the following context.
Return ONLY the raw PlantUML code, without markdown blocks, without \`\`\`plantuml.
Start with @startuml and end with @enduml.

Context: ${context}`;

    try {
        const responseText = await callOpenRouter(prompt);
        // Clean up markdown code blocks if the AI still included them
        let code = responseText.trim();
        if (code.startsWith('\`\`\`')) {
            const lines = code.split('\n');
            if (lines.length > 2) {
                code = lines.slice(1, -1).join('\n');
            }
        }
        return code.trim();
    } catch (error) {
        console.error("ER Diagram Generation Error:", error);
        throw error;
    }
};
