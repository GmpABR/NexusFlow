import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import Placeholder from '@tiptap/extension-placeholder';
import { Menu, Loader, Tooltip, Group, Modal, TextInput, Button, Stack, Text, useComputedColorScheme } from '@mantine/core';
import { IconPlus, IconSparkles, IconWand, IconArrowRight, IconBriefcase, IconMessageCircle } from '@tabler/icons-react';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enhanceText, type AIMode, getApiKey } from '../api/ai';
import { notifications } from '@mantine/notifications';
import '@mantine/tiptap/styles.css';

interface RichTextProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

export default function RichText({ content, onChange, editable = true }: RichTextProps) {
    const computedColorScheme = useComputedColorScheme('dark');
    const navigate = useNavigate();
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
        if (!getApiKey()) {
            notifications.show({
                title: 'AI Key Required',
                message: (
                    <Stack gap={8}>
                        <Text size="sm">Please add your OpenRouter API key in your profile settings to use AI features.</Text>
                        <Button
                            size="xs"
                            variant="light"
                            color="cyan"
                            onClick={() => {
                                navigate('/profile#ai-configuration');
                                notifications.clean();
                            }}
                        >
                            Configure AI Settings
                        </Button>
                    </Stack>
                ),
                color: 'orange',
                autoClose: 10000
            });
            return;
        }

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
        <RichTextEditor
            editor={editor}
            styles={{
                root: {
                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#dee2e6'}`,
                    borderRadius: 8,
                    overflow: 'hidden'
                },
                toolbar: {
                    background: (computedColorScheme === 'dark' ? '#25262b' : '#f8f9fa') + ' !important',
                    borderBottom: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#dee2e6'} !important`,
                },
                content: {
                    background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white',
                    color: computedColorScheme === 'dark' ? 'white' : 'black',
                    minHeight: 120,
                },
                control: {
                    background: 'transparent !important',
                    border: 'none !important',
                    color: (computedColorScheme === 'dark' ? '#c1c2c5' : '#495057') + ' !important',
                    '&:hover': {
                        background: (computedColorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') + ' !important'
                    },
                    '& svg': {
                        color: (computedColorScheme === 'dark' ? '#c1c2c5' : '#495057') + ' !important',
                    }
                }
            }}
        >
            {editable && (
                <RichTextEditor.Toolbar
                    style={{
                        background: computedColorScheme === 'dark' ? '#25262b' : '#f8f9fa',
                        borderBottom: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#dee2e6'}`,
                    }}
                >
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
                                            backgroundColor: computedColorScheme === 'dark' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(124, 58, 237, 0.05)',
                                            borderColor: 'rgba(124, 58, 237, 0.3)',
                                            color: computedColorScheme === 'dark' ? '#a78bfa' : '#5c7cfa'
                                        }}
                                    >
                                        {isAILoading ? <Loader size={14} color="violet" /> : <IconSparkles size={18} />}
                                    </RichTextEditor.Control>
                                </Tooltip>
                            </Menu.Target>

                            <Menu.Dropdown
                                bg={computedColorScheme === 'dark' ? "#1a1b1e" : "white"}
                                style={{
                                    border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#dee2e6'}`,
                                    zIndex: 3005
                                }}
                            >
                                <Menu.Label c={computedColorScheme === 'dark' ? 'dimmed' : 'gray.6'}>AI Features</Menu.Label>
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
                            <Menu.Dropdown bg={computedColorScheme === 'dark' ? "#1a1b1e" : "white"} style={{ border: `1px solid ${computedColorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#dee2e6'}`, padding: '4px' }}>
                                <Group gap={4} p={4} justify="center">
                                    <RichTextEditor.Strikethrough />
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

            <Modal
                opened={customPromptOpen}
                onClose={() => setCustomPromptOpen(false)}
                title="Custom AI Instruction"
                centered
                styles={{
                    content: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                    header: { background: computedColorScheme === 'dark' ? '#1a1b1e' : 'white', color: computedColorScheme === 'dark' ? 'white' : 'black' },
                }}
            >
                <Stack>
                    <TextInput
                        placeholder="e.g., 'Translate to Spanish', 'Make it sound like a pirate'"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        data-autofocus
                        styles={{
                            input: {
                                background: computedColorScheme === 'dark' ? '#25262b' : 'white',
                                color: computedColorScheme === 'dark' ? 'white' : 'black',
                                borderColor: computedColorScheme === 'dark' ? '#373A40' : '#dee2e6'
                            }
                        }}
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
