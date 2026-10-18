import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { auth } from '../src/hooks/initializeFirebase';
import { theme } from '../src/branding';
import PageFrame from '../src/pages/PageFrame';

await auth.authStateReady();
Object.defineProperty(auth, 'currentUser', { get: () => ({ getIdToken: async () => 'fixture-only' }) });
let orders = [{
  id: 1, request_id: 101, restaurant_name: 'Pilot fixture kitchen', produce_type: 'Tomatoes',
  quantity_needed: 10, unit: 'kg', method: 'farmer_delivery', fee: '6.25', currency: 'USD',
  delivery_address: '100 Market Street', pickup_address: null, instructions: 'Call at arrival. Keep shaded.',
  revision: 1, stage: 'quoted', window_start: '2026-11-01T10:00:00Z', window_end: '2026-11-01T12:00:00Z',
  farmer_name: 'Fixture Farmer', farmer_contact: 'fixture@example.com',
}];
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input);
  if (!url.includes('/api/fulfillment/')) return originalFetch(input, init);
  if (url.endsWith('/accept')) {
    const body = JSON.parse(String(init?.body));
    if (body.revision !== orders[0].revision) return Response.json({ detail: 'Quote changed. Refresh and review.' }, { status: 409 });
    orders[0].stage = 'accepted';
    return Response.json(orders[0]);
  }
  if (init?.method === 'POST') {
    const body = JSON.parse(String(init.body));
    const order = { ...orders[0], ...body, id: 2, request_id: 102, fee: null, revision: 0, stage: 'requested',
      window_start: body.delivery_window_start, window_end: body.delivery_window_end };
    orders = [order, ...orders];
    return Response.json(order);
  }
  return Response.json(orders);
};
const root = document.getElementById('fixture');
if (!root) throw new Error('Missing fixture root');
createRoot(root).render(<ThemeProvider theme={theme}><CssBaseline /><MemoryRouter initialEntries={['/dashboard/produce-orders']}><PageFrame /></MemoryRouter></ThemeProvider>);
