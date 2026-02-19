import { useEffect } from 'react';

type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

/**
 * Registers global keyboard shortcuts.
 * Shortcuts are skipped when the user is typing inside an input, textarea, or contenteditable.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        const handler = (e: KeyboardEvent) => {
            // Skip if user is typing in an input-like element
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.tagName === 'SELECT'
            ) return;

            const key = e.key;
            if (shortcuts[key]) {
                shortcuts[key](e);
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [shortcuts, enabled]);
}
