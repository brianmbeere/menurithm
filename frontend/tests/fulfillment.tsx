import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { auth } from '../src/hooks/initializeFirebase';
import { theme } from '../src/branding';
import PageFrame from '../src/pages/PageFrame';

await auth.authStateReady();
Object.defineProperty(auth, 'currentUser', { get: () => ({
  getIdToken: async () => 'fixture-only', displayName: 'Fixture Kitchen', email: 'kitchen@example.com', emailVerified: true,
}) });
let orders = [{
  id: 1, request_id: 101, restaurant_name: 'Pilot fixture kitchen', produce_type: 'Tomatoes',
  quantity_needed: 10, unit: 'kg', method: 'farmer_delivery', fee: '6.25', currency: 'USD',
  delivery_address: '100 Market Street', pickup_address: null, instructions: 'Call at arrival. Keep shaded.',
  revision: 1, stage: 'quoted', window_start: '2026-11-01T10:00:00Z', window_end: '2026-11-01T12:00:00Z',
  farmer_name: 'Fixture Farmer', farmer_contact: 'fixture@example.com',
  produce_total: '30.00', sale_total: '36.25', stock_reserved: false,
}];
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input);
  if (/\/(inventory(?:\/summary|\/low-stock)?|sales|dishes)$/.test(url)) return Response.json([]);
  if (url.endsWith('/advanced-inventory/analytics')) return Response.json({
    optimization_score: 72, cost_savings_potential: '$40', waste_reduction_percentage: 8,
    top_cost_saving_opportunities: [],
  });
  if (url.includes('/advanced-inventory/alerts?')) return Response.json({ alerts: [] });
  if (!url.includes('/api/fulfillment/')) return originalFetch(input, init);
  if (url.includes('/produce/available')) return Response.json([
    { id: 501, seller_id: 1, seller_name: 'Fixture Farmer', produce_type: 'Tomatoes', quantity_available: 20,
      unit: 'kg', price_per_unit: 3, location: 'Fixture Farm', organic: true, variety: 'Roma',
      description: 'Firm tomatoes for roasting and sauces.', harvest_date: '2026-11-18',
      expiry_date: '2026-11-25', illustration: { id: 'seedling', label: 'Seedling', symbol: '🌱', background: '#e7eddc' } },
    { id: 502, seller_id: 1, seller_name: 'Fixture Farmer', produce_type: 'Spinach', quantity_available: 8,
      unit: 'lb', price_per_unit: 5, location: 'Fixture Farm' },
    { id: 503, seller_id: 2, seller_name: 'North Farm', produce_type: 'Carrots', quantity_available: 12,
      unit: 'lb', price_per_unit: 4, location: 'North Farm' },
  ]);
  if (url.endsWith('/marketplace/checkout-preview')) {
    const body = JSON.parse(String(init?.body));
    const line = body.lines[0];
    if (line.listing_id !== 501 || Number(line.quantity) > 20) {
      return Response.json({ detail: 'Not enough tomatoes are available.' }, { status: 409 });
    }
    const subtotal = (Number(line.quantity) * 3).toFixed(2);
    return Response.json({ seller_name: 'Fixture Farmer', produce_subtotal: subtotal, payment_method: 'pay_at_pickup',
      pickup_windows: [{ id: 9, address: 'Fixture gate', starts_at: '2099-11-18T16:00:00Z', ends_at: '2099-11-18T18:00:00Z' }],
      lines: [{ listing_id: 501, produce_type: 'Tomatoes', unit: 'kg', quantity: line.quantity, line_total: subtotal }] });
  }
  if (url.endsWith('/marketplace/pickup-checkouts')) {
    const body = JSON.parse(String(init?.body));
    if (body.window_id !== 9 || !body.restaurant_name || !body.attempt_key) {
      return Response.json({ detail: 'Missing pickup order details.' }, { status: 422 });
    }
    return Response.json({ id: 42, state: 'placed', produce_subtotal: body.expected_subtotal });
  }
  if (url.endsWith('/accept')) {
    const body = JSON.parse(String(init?.body));
    if (body.revision !== orders[0].revision) return Response.json({ detail: 'Quote changed. Refresh and review.' }, { status: 409 });
    orders[0].stage = 'accepted';
    orders[0].stock_reserved = true;
    return Response.json(orders[0]);
  }
  if (url.endsWith('/cancel')) {
    const order = orders.find(item => url.endsWith(`/${item.id}/cancel`));
    if (!order) return Response.json({ detail: 'Order not found' }, { status: 404 });
    order.stage = 'canceled';
    order.stock_reserved = false;
    return Response.json(order);
  }
  if (init?.method === 'POST') {
    const body = JSON.parse(String(init.body));
    const order = { ...orders[0], ...body, id: 2, request_id: 102, fee: null, revision: 0, stage: 'requested',
      produce_total: null, sale_total: null, stock_reserved: false,
      window_start: body.delivery_window_start, window_end: body.delivery_window_end };
    orders = [order, ...orders];
    return Response.json(order);
  }
  return Response.json(orders);
};
const root = document.getElementById('fixture');
if (!root) throw new Error('Missing fixture root');
createRoot(root).render(<ThemeProvider theme={theme}><CssBaseline /><MemoryRouter initialEntries={['/dashboard/produce-orders']}><PageFrame /></MemoryRouter></ThemeProvider>);
