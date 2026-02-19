import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import Placeholder from '@tiptap/extension-placeholder';
import { Menu, Loader, Tooltip, Group, Modal, TextInput, Button, Stack } from '@mantine/core';
import { IconPlus, IconSparkles, IconWand, IconArrowRight, IconBriefcase, IconMessageCircle } from '@tabler/icons-react';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useEffect, useState } from 'react';
import { enhanceText, type AIMode } from '../api/ai';
import { notifications } from '@mantine/notifications';
import '@mantine/tiptap/styles.css';

interface RichTextProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

export default function RichText({ content, onChange, editable = true }: RichTextProps) {
    const [isAILoading, setIsAILoading] = useState(false);
    const [customPromptOpen, setCustomPromptOpen] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: 'editor-link',
                },
            }),
            Superscript,
            SubScript,
            Highlight,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Placeholder.configure({ placeholder: 'Add a description...' }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editable,
    });

    // Update content if changed externally (e.g. initial load or SignalR)
    useEffect(() => {
        if (!editor) return;

        if (content !== editor.getHTML()) {
            if (!editor.isFocused || editor.isEmpty) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    const handleAIEnchant = async (mode: AIMode = 'enhance', customInstruction?: string) => {
        if (!editor) return;
        const currentText = editor.getText();
        if (!currentText.trim() || currentText.length < 3) {
            notifications.show({ title: 'AI Assistant', message: 'Please write a bit more so I can understand your task!', color: 'blue' });
            return;
        }

        setIsAILoading(true);
        const loadingId = notifications.show({
            title: 'AI Magic ✨',
            message: 'Queuing efficiently... (this may take 10-20s)',
            loading: true,
            autoClose: false,
            withCloseButton: false
        });

        try {
            const improved = await enhanceText(currentText, mode, customInstruction);

            // We use setContent which Tiptap handles well for markdown-like text
            editor.commands.setContent(improved);

            notifications.update({
                id: loadingId,
                title: 'Text Enchanted! 💎',
                message: 'Your description was professionally improved.',
                color: 'violet',
                loading: false,
                autoClose: 3000
            });
        } catch (error: any) {
            notifications.update({
                id: loadingId,
                title: 'AI Busy / Timeout',
                message: 'The free AI queue is full. Please try again in a moment!',
                color: 'orange',
                loading: false,
                autoClose: 4000
            });
        } finally {
            setIsAILoading(false);
        }
    };

    if (!editor) return null;

    return (
        <RichTextEditor editor={editor}>
            {editable && (
                <RichTextEditor.Toolbar>
                    {/* Main Bar - Essentials Only */}
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Underline />
                        <RichTextEditor.Link />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.H1 />
                        <RichTextEditor.H2 />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.BulletList />
                        <RichTextEditor.OrderedList />
                    </RichTextEditor.ControlsGroup>

                    <RichTextEditor.ControlsGroup>
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <Tooltip label="AI Assistant" withArrow>
                                    <RichTextEditor.Control
                                        disabled={isAILoading}
                                        style={{
                                            backgroundColor: 'rgba(124, 58, 237, 0.1)',
                                            borderColor: 'rgba(124, 58, 237, 0.3)',
                                            color: '#a78bfa'
                                        }}
                                    >
                                        {isAILoading ? <Loader size={14} color="violet" /> : <IconSparkles size={18} />}
                                    </RichTextEditor.Control>
                                </Tooltip>
                            </Menu.Target>

                            <Menu.Dropdown bg="#1a1b1e" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Menu.Label>AI Features</Menu.Label>
                                <Menu.Item
                                    leftSection={<IconSparkles size={14} />}
                                    onClick={() => handleAIEnchant('enhance')}
                                >
                                    Enhance Writing
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<IconWand size={14} />}
                                    onClick={() => handleAIEnchant('grammar')}
                                >
                                    Fix Grammar & Spelling
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<IconArrowRight size={14} />}
                                    onClick={() => handleAIEnchant('shorten')}
                                >
                                    Shorten
                                </Menu.Item>
                                <Menu.Item
                                    leftSection={<IconBriefcase size={14} />}
                                    onClick={() => handleAIEnchant('professional')}
                                >
                                    Make Professional
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    leftSection={<IconMessageCircle size={14} />}
                                    onClick={() => setCustomPromptOpen(true)}
                                >
                                    Custom Prompt...
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </RichTextEditor.ControlsGroup>

                    {/* Extras in a Menu */}
                    <RichTextEditor.ControlsGroup>
                        <Menu shadow="md" width={160} position="bottom-end">
                            <Menu.Target>
                                <RichTextEditor.Control title="More options">
                                    <IconPlus size={18} stroke={2.5} />
                                </RichTextEditor.Control>
                            </Menu.Target>
                            <Menu.Dropdown bg="#1a1b1e" style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '4px' }}>
                                <Group gap={4} p={4} justify="center">
                                    <RichTextEditor.Control title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}>
                                        <RichTextEditor.Strikethrough />
                                    </RichTextEditor.Control>
                                    <RichTextEditor.H3 />
                                    <RichTextEditor.Blockquote />
                                    <RichTextEditor.Hr />
                                    <RichTextEditor.Subscript />
                                    <RichTextEditor.Superscript />
                                    <RichTextEditor.ClearFormatting />
                                </Group>
                            </Menu.Dropdown>
                        </Menu>
                    </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>
            )}

            <RichTextEditor.Content />

            <Modal opened={customPromptOpen} onClose={() => setCustomPromptOpen(false)} title="Custom AI Instruction" centered>
                <Stack>
                    <TextInput
                        placeholder="e.g., 'Translate to Spanish', 'Make it sound like a pirate'"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        data-autofocus
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setCustomPromptOpen(false)}>Cancel</Button>
                        <Button
                            color="violet"
                            onClick={() => {
                                setCustomPromptOpen(false);
                                handleAIEnchant('custom', customPrompt);
                            }}
                            disabled={!customPrompt.trim()}
                        >
                            Enhance
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </RichTextEditor>
    );
}
