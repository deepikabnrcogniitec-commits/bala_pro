import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import App from './App';
import './index.css';

const theme = createTheme({
  primaryColor: 'gold',
  primaryShade: 5,
  colors: {
    brand: ['#eaf1f7','#cddce8','#a9c2d6','#82a6c3','#5f8db2','#3f76a0','#2a628f','#1f527a','#153f63','#0c2f4e'],
    gold: ['#fff7e6','#ffe9bf','#ffd88f','#ffc55c','#ffb333','#f9a91b','#e0940f','#b8770c','#8f5c0a','#664307'],
    crimson: ['#fdeceb','#f8c9c6','#f2a29d','#ec7972','#e6544c','#cd302b','#b32621','#8f1e1a','#6b1614','#470e0d'],
    // Remaps Mantine's dark-mode surface palette onto the Hungora logo's navy —
    // every component that reads theme.colors.dark (AppShell, Paper, Table, Modal…)
    // picks this up automatically, so the whole app retheme without per-page edits.
    dark: ['#f6f4ee','#c7ceda','#a9b1c4','#8892a8','#3a5975','#123f66','#0c2f4e','#071c30','#05141f','#030d16'],
  },
  fontFamily: 'Inter, -apple-system, sans-serif',
  defaultRadius: 'lg',
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ModalsProvider>
        <Notifications position="top-right" />
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>
);
