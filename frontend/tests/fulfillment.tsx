import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { auth } from '../src/hooks/initializeFirebase';
import { theme } from '../src/branding';
import PageFrame from '../src/pages/PageFrame';
import type { InventoryItem } from '../src/api/updateInventory';
import type { InventoryMovement } from '../src/api/fetchInventoryMovements';
import type { Dish } from '../src/api/fetchDishes';
import type { DishInput } from '../src/api/createDish';

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
const params = new URLSearchParams(location.search);
let simulateStockChange = params.has('stock-change');
let stockReads = 0;
const stock: InventoryItem[] = [
  { id: 1, ingredient_name: 'tomatoes', quantity: '2', reorder_point: '4', unit: 'lb', category: 'Vegetables', expiry_date: '2099-12-01', storage_location: 'Fridge' },
  { id: 2, ingredient_name: 'flour', quantity: '10', reorder_point: '3', unit: 'lb', category: 'Grains', expiry_date: '2099-12-01', storage_location: 'Pantry' },
  { id: 3, ingredient_name: 'basil', quantity: '0', reorder_point: '0', unit: 'bunch', category: 'Herbs', expiry_date: '2099-12-01', storage_location: 'Fridge' },
];
const movements: Record<string, InventoryMovement[]> = {};
let nextStockId = 4;
let recipes: Dish[] = [
  { id: 1, name: 'Tomato soup', recipe_yield: '8', ingredients: [
    { ingredient_id: 1, quantity: 4, quantity_decimal: '4', unit: 'lb' },
  ] },
  { id: 2, name: 'Basil sauce', recipe_yield: null, ingredients: [
    { ingredient_id: 3, quantity: 2, quantity_decimal: null, unit: 'bunch' },
  ] },
];
let nextDishId = 3;
window.fetch = async (input, init) => {
  const url = String(input);
  if (params.has('recipes')) {
    if (url.endsWith('/inventory')) return Response.json(stock);
    if (url.endsWith('/dishes') && (!init?.method || init.method === 'GET')) return Response.json(recipes);
    const match = url.match(/\/dishes\/(\d+)$/);
    if (match && init?.method === 'DELETE') {
      recipes = recipes.filter(dish => dish.id !== Number(match[1]));
      return new Response(null, { status: 204 });
    }
    if ((match && init?.method === 'PUT') || (url.endsWith('/dishes') && init?.method === 'POST')) {
      const body: DishInput = JSON.parse(String(init.body));
      if (typeof body.recipe_yield !== 'string' || body.ingredients.some(line => typeof line.quantity !== 'string')) {
        return Response.json({ detail: 'Recipe quantities must be sent as decimal strings in this fixture.' }, { status: 400 });
      }
      const saved: Dish = { ...body, id: match ? Number(match[1]) : nextDishId++,
        ingredients: body.ingredients.map(line => ({
          ...line, quantity: Number(line.quantity), quantity_decimal: line.quantity,
        })) };
      recipes = match ? recipes.map(dish => dish.id === saved.id ? saved : dish) : [...recipes, saved];
      return Response.json(saved);
    }
  }
  if (params.has('inventory')) {
    if (url.endsWith('/inventory') && init?.method === 'POST') {
      const item: InventoryItem = { ...JSON.parse(String(init.body)), id: nextStockId++ };
      stock.push(item);
      movements[item.ingredient_name] = [{ id: 1, sale_id: null, movement_type: 'adjustment',
        quantity_change: item.quantity, quantity_before: '0', quantity_after: item.quantity,
        unit: item.unit, reason: 'Initial inventory entry', created_at: '2026-11-18T16:00:00Z' }];
      return Response.json(item);
    }
    if (url.endsWith('/inventory')) {
      if (++stockReads === 2 && simulateStockChange) {
        stock[0].quantity = '1';
        simulateStockChange = false;
      }
      return Response.json(stock);
    }
    if (url.endsWith('/inventory/low-stock')) {
      return Response.json(stock.filter(item => Number(item.reorder_point) > 0 && Number(item.quantity) <= Number(item.reorder_point)));
    }
    const target = url.match(/\/inventory\/([^/]+)(\/movements)?$/);
    if (target) {
      const name = decodeURIComponent(target[1]);
      if (target[2]) return Response.json(movements[name] ?? []);
      const item = stock.find(entry => entry.ingredient_name === name);
      if (!item) return Response.json({ detail: 'Ingredient not found' }, { status: 404 });
      if (init?.method === 'PUT') {
        const { adjustment_reason: reason, ...updates } = JSON.parse(String(init.body));
        if (item.quantity !== updates.quantity) {
          if (!reason) return Response.json({ detail: 'Adjustment reason required' }, { status: 400 });
          (movements[name] ??= []).unshift({ id: (movements[name]?.length ?? 0) + 1, sale_id: null, movement_type: 'adjustment',
            quantity_change: String(Number(updates.quantity) - Number(item.quantity)), quantity_before: item.quantity,
            quantity_after: updates.quantity, unit: item.unit, reason, created_at: '2026-11-18T16:00:00Z' });
        }
        Object.assign(item, updates);
        return Response.json(item);
      }
      if (init?.method === 'DELETE') {
        if (movements[name]?.length) return Response.json({ detail: 'This ingredient has stock movement history.' }, { status: 400 });
        stock.splice(stock.indexOf(item), 1);
        return new Response(null, { status: 204 });
      }
    }
  }
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
const start = params.has('inventory') ? '/dashboard/inventory' : params.has('recipes') ? '/dashboard/dishes' : '/dashboard/produce-orders';
createRoot(root).render(<ThemeProvider theme={theme}><CssBaseline /><MemoryRouter initialEntries={[start]}><PageFrame /></MemoryRouter></ThemeProvider>);
