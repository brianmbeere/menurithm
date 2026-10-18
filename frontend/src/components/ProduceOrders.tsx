import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress,
  FormControlLabel, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { authFetch } from '../hooks/authFetch';
import { BASE_URL } from '../utils';
import { getAuth } from 'firebase/auth';

interface Order {
  id: number;
  request_id: number;
  restaurant_name: string;
  produce_type: string;
  quantity_needed: number;
  unit: string;
  method: 'customer_pickup' | 'farmer_delivery';
  fee: string | null;
  currency: string;
  pickup_address: string | null;
  instructions: string | null;
  delivery_address: string;
  window_start: string;
  window_end: string;
  revision: number;
  stage: string;
  farmer_name: string | null;
  farmer_contact: string | null;
}

const methodName = (method: string) => method === 'customer_pickup' ? 'Customer pickup' : 'Farmer delivery';
const stageName = (stage: string) => ({
  requested: 'Awaiting farmer quote', quoted: 'Your approval needed', accepted: 'Confirmed',
  ready: 'Ready for handover', collected: 'Collected', delivered: 'Delivered',
}[stage] || stage);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  await getAuth().authStateReady();
  const response = await authFetch(`${BASE_URL}/api/fulfillment/${path}`, options);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(typeof body.detail === 'string' ? body.detail : 'Please check the order fields and try again.');
  }
  return body;
}

export default function ProduceOrders({ onCreated }: { onCreated?: (order: Order) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accepted, setAccepted] = useState<Record<number, number>>({});
  const signedIn = Boolean(getAuth().currentUser);
  const [form, setForm] = useState({
    restaurant_name: '', produce_type: '', quantity_needed: '10', unit: 'kg',
    method: 'customer_pickup', delivery_address: '', delivery_window_start: '',
    delivery_window_end: '', special_requirements: '',
  });
  const refresh = async () => {
    setError('');
    setLoading(true);
    try { setOrders(await request<Order[]>('orders')); setAccepted({}); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load orders'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const order = await request<Order>('orders', {
        method: 'POST', body: JSON.stringify({
          ...form, quantity_needed: Number(form.quantity_needed),
          delivery_address: form.method === 'farmer_delivery' ? form.delivery_address : '',
          delivery_window_start: new Date(form.delivery_window_start).toISOString(),
          delivery_window_end: new Date(form.delivery_window_end).toISOString(),
        }),
      });
      setOrders(previous => [order, ...previous]);
      setNotice('Request sent. A farmer will quote the fulfillment terms for your approval.');
      onCreated?.(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create order. Refresh orders before retrying.');
    } finally { setBusy(false); }
  };
  const accept = async (order: Order) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = await request<Order>(`orders/${order.id}/accept`, {
        method: 'POST', body: JSON.stringify({ revision: order.revision }),
      });
      setOrders(previous => previous.map(item => item.id === updated.id ? updated : item));
      setNotice('Fulfillment terms accepted. Arrange produce payment with the farmer.');
    } catch (err) {
      setAccepted({});
      setError(err instanceof Error ? err.message : 'Unable to accept quote. Refresh and review the latest terms.');
    } finally { setBusy(false); }
  };
  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <TextField fullWidth required label={label} type={type} value={form[key]}
      slotProps={type === 'datetime-local' ? { inputLabel: { shrink: true } } : undefined}
      onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} />
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">Farm-to-kitchen sourcing</Typography>
        <Typography variant="h4">Produce orders</Typography>
        <Typography color="text.secondary">Choose how fresh produce reaches your kitchen. No courier marketplace, no surprise delivery charges.</Typography>
      </Box>
      <Alert severity="info">Pilot service: quotes cover the delivery fee only, not the produce price. Agree produce pricing and arrange all payments directly with your farmer. Accepting a quote does not charge you.</Alert>
      {error && <Alert severity="error" role="alert"
        action={!signedIn ? <Button color="inherit" href="/signin?next=/dashboard/produce-orders">Sign in</Button> : undefined}>
        {!signedIn ? 'Sign in to your Menurithm account to request produce and review your farmer quotes.' : error}
      </Alert>}
      {notice && <Alert severity="success" role="status">{notice}</Alert>}
      <Card><CardContent>
        <Typography variant="h6" gutterBottom>Request fresh produce</Typography>
        <Box component="form" onSubmit={submit} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {field('restaurant_name', 'Restaurant / customer name')}
          {field('produce_type', 'Produce needed')}
          <TextField fullWidth required label="Quantity" type="number" value={form.quantity_needed}
            slotProps={{ htmlInput: { min: 0.01, step: 'any' } }}
            onChange={event => setForm(previous => ({ ...previous, quantity_needed: event.target.value }))} />
          {field('unit', 'Unit (kg, boxes, bunches...)')}
          <TextField select label="Preferred fulfillment" value={form.method}
            onChange={event => setForm(previous => ({ ...previous, method: event.target.value }))}>
            <MenuItem value="customer_pickup">Customer pickup · no delivery fee</MenuItem>
            <MenuItem value="farmer_delivery">Farmer delivery · fee quoted by farmer</MenuItem>
          </TextField>
          {form.method === 'farmer_delivery' && field('delivery_address', 'Delivery address')}
          {field('delivery_window_start', 'Preferred window start', 'datetime-local')}
          {field('delivery_window_end', 'Preferred window end', 'datetime-local')}
          <TextField fullWidth multiline minRows={2} label="Quality, access or handling requirements" value={form.special_requirements}
            onChange={event => setForm(previous => ({ ...previous, special_requirements: event.target.value }))} />
          <Box sx={{ alignSelf: 'end' }}><Button type="submit" variant="contained" disabled={busy || loading || !signedIn}>{busy ? 'Saving...' : 'Send request to farmers'}</Button></Box>
        </Box>
      </CardContent></Card>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Your requests & agreements</Typography>
        <Button onClick={refresh} disabled={loading || busy}>Refresh orders</Button>
      </Stack>
      {loading ? <CircularProgress aria-label="Loading orders" /> : orders.length === 0 && !error ?
        <Alert severity="info">No requests yet. Send your first request above; farmer quotes will appear here.</Alert> : null}
      {orders.map(order => (
        <Card key={order.id}><CardContent>
          <Stack spacing={2}>
            <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="space-between">
              <Typography variant="h6">{order.quantity_needed} {order.unit} {order.produce_type}</Typography>
              <Chip label={stageName(order.stage)} color={order.stage === 'quoted' ? 'warning' : 'default'} />
            </Stack>
            <Typography variant="body2" color="text.secondary">Request #{order.request_id} · {new Date(order.window_start).toLocaleString()} – {new Date(order.window_end).toLocaleString()}</Typography>
            <Typography fontWeight={650}>{methodName(order.method)} · {order.fee === null ? 'Awaiting fee quote' : `${order.currency} ${order.fee} delivery fee`}</Typography>
            {order.farmer_name && <Typography sx={{ overflowWrap: 'anywhere' }}>Farmer: {order.farmer_name} · {order.farmer_contact}</Typography>}
            <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {order.method === 'customer_pickup' ? `Pickup: ${order.pickup_address || 'Farmer will confirm location'}` : `Deliver to: ${order.delivery_address}`}
            </Typography>
            {order.instructions && <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{order.instructions}</Typography>}
            {order.stage === 'quoted' && <>
              <FormControlLabel sx={{ alignItems: 'flex-start', ml: -1 }} control={
                <Checkbox checked={accepted[order.id] === order.revision}
                  onChange={(_, checked) => setAccepted(previous => ({ ...previous, [order.id]: checked ? order.revision : 0 }))} />
              } label={`I accept ${methodName(order.method).toLowerCase()}, the ${order.currency} ${order.fee} delivery fee, the window and handover instructions above (quote ${order.revision}). Produce pricing and payment are arranged separately.`} />
              <Button sx={{ alignSelf: 'flex-start' }} variant="contained"
                disabled={busy || accepted[order.id] !== order.revision} onClick={() => accept(order)}>Accept these fulfillment terms</Button>
            </>}
          </Stack>
        </CardContent></Card>
      ))}
    </Stack>
  );
}
