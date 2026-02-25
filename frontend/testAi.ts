import { generateTasksForColumn } from './src/api/ai';

// Mock getApiKey to return true so it bypasses auth check if any
const mockGetApiKey = () => "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";
jest.mock('./src/api/ai', () => {
    const original = jest.requireActual('./src/api/ai');
    return {
        ...original,
        getApiKey: mockGetApiKey
    };
});

async function run() {
    process.env.VITE_OPENROUTER_API_KEY = "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";
    try {
        const result = await generateTasksForColumn("To Do", [], "A generic task management app", "");
        console.log("GENERATED:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
