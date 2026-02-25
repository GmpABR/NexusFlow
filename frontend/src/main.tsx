
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import App from './App';

const theme = createTheme({
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  primaryColor: 'violet',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#000000',
    ],
  },
  defaultRadius: 'md',
  headings: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
});

createRoot(document.getElementById('root')!).render(
  // StrictMode removed to fix react-beautiful-dnd issue in development
  <MantineProvider theme={theme} defaultColorScheme="dark">
    <Notifications position="bottom-right" zIndex={1000000} />
    <App />
  </MantineProvider>
);
