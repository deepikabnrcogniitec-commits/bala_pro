import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dropzone/styles.css';
import './index.css';

const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: [
      '#eaf1f7','#cddce8','#a9c2d6','#82a6c3','#5f8db2',
      '#3f76a0','#2a628f','#1f527a','#153f63','#0c2f4e',
    ],
  },
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md',
  components: {
    Button: { styles: { root: { fontWeight: 600 } } },
  },
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 2 * 60 * 1000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Notifications position="top-right" autoClose={4000} />
        <App />
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
