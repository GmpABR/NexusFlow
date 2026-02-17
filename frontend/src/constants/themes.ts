export const BOARD_THEMES = {
    blue: {
        background: '#0079bf',
        gradient: 'linear-gradient(135deg, #0079bf 0%, #005a8f 100%)',
        card: '#ebecf0',
        text: '#172b4d',
    },
    orange: {
        background: '#d29034',
        gradient: 'linear-gradient(135deg, #d29034 0%, #a67129 100%)',
        card: '#ebecf0',
        text: '#172b4d',
    },
    green: {
        background: '#519839',
        gradient: 'linear-gradient(135deg, #519839 0%, #3e752c 100%)',
        card: '#ebecf0',
        text: '#172b4d',
    },
    red: {
        background: '#b04632',
        gradient: 'linear-gradient(135deg, #b04632 0%, #8c3728 100%)',
        card: '#ebecf0',
        text: '#172b4d',
    },
    purple: {
        background: '#89609e',
        gradient: 'linear-gradient(135deg, #89609e 0%, #6d4c7e 100%)',
        card: '#ebecf0',
        text: '#172b4d',
    },
    pink: {
        background: '#cd5a91',
        gradient: 'linear-gradient(135deg, #cd5a91 0%, #a34874 100%)',
        card: '#ebecf0',
        text: '#172b4d',
    },
};

export type ThemeColor = keyof typeof BOARD_THEMES;
