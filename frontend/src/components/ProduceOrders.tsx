import { useCallback, useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress,
  FormControlLabel, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { authFetch } from '../hooks/authFetch';
import { BASE_URL } from '../utils';
import { getAuth } from 'firebase/auth';
import fetchInventory from '../api/fetchInventory';
import { type InventoryItem } from '../api/updateInventory';
import { fetchCroprithmProduce, type CroprithmProduceListing } from '../api/fetchCroprithmProduce';

interface Order {
  pickup_checkout_id?: number | null;
  id: number;
  request_id: number;
  restaurant_name: string;
  produce_type: string;
  quantity_needed: number;
  unit: string;
  method: 'customer_pickup' | 'farmer_delivery';
  fee: string | null;
  produce_total?: string | null;
  sale_total?: string | null;
  stock_reserved?: boolean;
  payment_recorded_at?: string | null;
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
  produce_inventory_id: number | null;
  menurithm_inventory_item_id: number | null;
  inventory_received?: boolean;
}

interface Receipt {
  receipt_number: string;
  order_id: number;
  request_id: number | null;
  received_at: string;
  restaurant_name: string | null;
  produce_type: string;
  ingredient_name: string;
  quantity_received: string;
  unit: string;
  stock_before: string;
  stock_after: string;
  farmer_name: string | null;
  farmer_contact: string | null;
  fulfillment_method: string;
  notice: string;
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

export default function ProduceOrders({
  onCreated,
  initialInventoryItemId,
}: {
  onCreated?: (order: Order) => void;
  initialInventoryItemId?: number;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accepted, setAccepted] = useState<Record<number, number>>({});
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | ''>(initialInventoryItemId || '');
  const [listings, setListings] = useState<CroprithmProduceListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<CroprithmProduceListing | null>(null);
  const [searchingListings, setSearchingListings] = useState(false);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, string>>({});
  const [receiptUnits, setReceiptUnits] = useState<Record<number, string>>({});
  const signedIn = Boolean(getAuth().currentUser);
  const [form, setForm] = useState({
    restaurant_name: '', produce_type: '', quantity_needed: '10', unit: 'kg',
    method: 'customer_pickup', delivery_address: '', delivery_window_start: '',
    delivery_window_end: '', special_requirements: '',
  });
  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await getAuth().authStateReady();
      const [currentOrders, currentInventory] = await Promise.all([
        request<Order[]>('orders'),
        fetchInventory(),
      ]);
      setOrders(currentOrders);
      setInventoryItems(currentInventory);
      if (initialInventoryItemId) {
        const linkedItem = currentInventory.find(item => item.id === initialInventoryItemId);
        if (linkedItem) {
          setSelectedInventoryId(linkedItem.id);
          const currentQuantity = Number(linkedItem.quantity);
          const reorderPoint = Number(linkedItem.reorder_point);
          const suggestedQuantity = Number.isFinite(currentQuantity) && Number.isFinite(reorderPoint)
            ? Math.max(0, reorderPoint - currentQuantity)
            : 0;
          setForm(previous => ({
            ...previous,
            produce_type: linkedItem.ingredient_name,
            unit: linkedItem.unit || previous.unit,
            quantity_needed: suggestedQuantity > 0
              ? String(suggestedQuantity)
              : previous.quantity_needed,
          }));
        }
      }
      setReceiptQuantities(Object.fromEntries(currentOrders.map(order => [
        order.id,
        String(order.quantity_needed),
      ])));
      setReceiptUnits(Object.fromEntries(currentOrders.map(order => [
        order.id,
        order.unit,
      ])));
      setAccepted({});
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load orders'); }
    finally { setLoading(false); }
  }, [initialInventoryItemId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const searchListings = async () => {
    setSearchingListings(true);
    setError('');
    try {
      setListings(await fetchCroprithmProduce(form.produce_type));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load current farmer listings.');
    } finally {
      setSearchingListings(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const order = await request<Order>('orders', {
        method: 'POST', body: JSON.stringify({
          ...form, quantity_needed: Number(form.quantity_needed),
          produce_inventory_id: selectedListing?.id ?? null,
          inventory_item_id: selectedInventoryId || null,
          delivery_address: form.method === 'farmer_delivery' ? form.delivery_address : '',
          delivery_window_start: new Date(form.delivery_window_start).toISOString(),
          delivery_window_end: new Date(form.delivery_window_end).toISOString(),
        }),
      });
      setOrders(previous => [order, ...previous]);
      setNotice('Request sent. A farmer will quote the fulfillment terms for your approval.');
      setSelectedListing(null);
      onCreated?.(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create order. Refresh orders before retrying.');
    } finally { setBusy(false); }
  };
  const receive = async (order: Order) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`orders/${order.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          quantity_received: receiptQuantities[order.id] ?? String(order.quantity_needed),
          unit: receiptUnits[order.id] ?? order.unit,
        }),
      });
      setInventoryItems(await fetchInventory());
      setOrders(previous => previous.map(item => item.id === order.id
        ? { ...item, inventory_received: true }
        : item));
      setNotice(`Receipt added to ${inventoryItems.find(
        item => item.id === order.menurithm_inventory_item_id,
      )?.ingredient_name || 'kitchen inventory'} and recorded in inventory history.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm receipt.');
    } finally { setBusy(false); }
  };
  const downloadReceipt = async (order: Order) => {
    setBusy(true); setError('');
    try {
      const receipt = await request<Receipt>(`orders/${order.id}/receipt`);
      const pdf = new jsPDF();
      pdf.setFontSize(18);
      pdf.text('Produce Receiving Record', 20, 22);
      pdf.setFontSize(11);
      pdf.text(`Receipt: ${receipt.receipt_number}`, 20, 36);
      pdf.text(`Received: ${new Date(receipt.received_at).toLocaleString()}`, 20, 44);
      pdf.text(`Restaurant: ${receipt.restaurant_name || 'Not provided'}`, 20, 54);
      pdf.text(`Ingredient: ${receipt.ingredient_name}`, 20, 64);
      pdf.text(`Produce: ${receipt.produce_type}`, 20, 74);
      pdf.text(`Actual quantity received: ${receipt.quantity_received} ${receipt.unit}`, 20, 84);
      pdf.text(`Stock after receipt: ${receipt.stock_after} ${receipt.unit}`, 20, 94);
      pdf.text(`Croprithm order: #${receipt.order_id}`, 20, 104);
      if (receipt.request_id) pdf.text(`Request: #${receipt.request_id}`, 20, 114);
      pdf.text(`Farmer: ${receipt.farmer_name || 'Not provided'}`, 20, 124);
      if (receipt.farmer_contact) pdf.text(`Farmer contact: ${receipt.farmer_contact}`, 20, 134);
      pdf.text(`Fulfillment: ${methodName(receipt.fulfillment_method)}`, 20, 144);
      pdf.setFontSize(9);
      pdf.text(pdf.splitTextToSize(receipt.notice, 170), 20, 160);
      pdf.save(`${receipt.receipt_number}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate receipt.');
    } finally { setBusy(false); }
  };
  const accept = async (order: Order) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = await request<Order>(`orders/${order.id}/accept`, {
        method: 'POST', body: JSON.stringify({ revision: order.revision }),
      });
      setOrders(previous => previous.map(item => item.id === updated.id ? updated : item));
      setNotice(updated.stock_reserved
        ? 'Order confirmed and stock reserved. Pay the farmer directly.'
        : 'Fulfillment terms accepted. Confirm stock and payment directly with the farmer.');
    } catch (err) {
      setAccepted({});
      setError(err instanceof Error ? err.message : 'Unable to accept quote. Refresh and review the latest terms.');
    } finally { setBusy(false); }
  };
  const cancel = async (order: Order) => {
    if (!window.confirm(order.pickup_checkout_id ? 'Cancel all items in this pickup order?' : 'Cancel this produce order and release any reserved stock?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (order.pickup_checkout_id) {
        await request(`marketplace/pickup-checkouts/${order.pickup_checkout_id}/cancel`, { method: 'POST' });
        setOrders(previous => previous.map(item => item.pickup_checkout_id === order.pickup_checkout_id
          ? { ...item, stage: 'canceled', stock_reserved: false } : item));
      } else {
        const updated = await request<Order>(`orders/${order.id}/cancel`, { method: 'POST' });
        setOrders(previous => previous.map(item => item.id === updated.id ? updated : item));
      }
      setNotice('Order canceled. If you already paid, contact the farmer directly.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel the order.');
    } finally { setBusy(false); }
  };
  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <TextField fullWidth required label={label} type={type} value={form[key]}
      slotProps={type === 'datetime-local' ? { inputLabel: { shrink: true } } : undefined}
      onChange={event => {
        setForm(previous => ({ ...previous, [key]: event.target.value }));
        if (key === 'produce_type') setSelectedListing(null);
      }} />
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">Farm-to-kitchen sourcing</Typography>
        <Typography variant="h4">Produce orders</Typography>
        <Typography color="text.secondary">Choose how fresh produce reaches your kitchen. No courier marketplace, no surprise delivery charges.</Typography>
      </Box>
      <Alert severity="info">Review the produce price and any delivery fee before accepting. Accepting a new quote reserves stock but does not charge you. Pay the farmer directly.</Alert>
      <Alert severity="info">Requests do not reserve farmer stock. Accepting a new quote rechecks availability and reserves stock.</Alert>
      {error && <Alert severity="error" role="alert"
        action={!signedIn ? <Button color="inherit" href="/signin?next=/dashboard/produce-orders">Sign in</Button> : undefined}>
        {!signedIn ? 'Sign in to your Menurithm account to request produce and review your farmer quotes.' : error}
      </Alert>}
      {notice && <Alert severity="success" role="status">{notice}</Alert>}
      <Card><CardContent>
        <Typography variant="h6" gutterBottom>Available Croprithm listings</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <TextField fullWidth label="Search produce" value={form.produce_type}
            onChange={event => setForm(previous => ({ ...previous, produce_type: event.target.value }))} />
          <Button variant="outlined" disabled={searchingListings || !signedIn} onClick={() => void searchListings()}>
            {searchingListings ? 'Searching...' : 'Find produce'}
          </Button>
        </Stack>
        {listings.map(listing => (
          <Card key={listing.id} variant="outlined" sx={{ mb: 1 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                <Box>
                  <Typography fontWeight={700}>
                    {listing.produce_type}{listing.variety ? ` · ${listing.variety}` : ''}
                    {listing.organic ? ' · Organic' : ''}
                  </Typography>
                  <Typography variant="body2">
                    {listing.quantity_available} {listing.unit} available · ${listing.price_per_unit}/{listing.unit}
                    {' · '}{listing.location} · {listing.seller_name}
                  </Typography>
                  {listing.description && <Typography variant="body2" color="text.secondary">{listing.description}</Typography>}
                </Box>
                <Button variant={selectedListing?.id === listing.id ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSelectedListing(listing);
                    setForm(previous => ({
                      ...previous,
                      produce_type: listing.produce_type,
                      unit: listing.unit,
                      quantity_needed: String(Math.min(Number(previous.quantity_needed) || 1, listing.quantity_available)),
                    }));
                  }}>
                  {selectedListing?.id === listing.id ? 'Selected' : 'Request listing'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {listings.length === 0 && !searchingListings &&
          <Typography variant="body2" color="text.secondary">Search to see current farmer listings and prices.</Typography>}
        <Typography variant="caption" color="text.secondary">
          Displayed prices are current listing prices. The farmer confirms the final price in the quote; payment is made directly to the farmer.
        </Typography>
      </CardContent></Card>
      <Card><CardContent>
        <Typography variant="h6" gutterBottom>Request fresh produce</Typography>
        <Box component="form" onSubmit={submit} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {field('restaurant_name', 'Restaurant / customer name')}
          {field('produce_type', 'Produce needed')}
          <TextField fullWidth required label="Quantity" type="number" value={form.quantity_needed}
            slotProps={{ htmlInput: { min: 0.01, step: 'any' } }}
            onChange={event => setForm(previous => ({ ...previous, quantity_needed: event.target.value }))} />
          {field('unit', 'Unit (kg, boxes, bunches...)')}
          <TextField select fullWidth label="Add received produce to kitchen ingredient" value={selectedInventoryId}
            onChange={event => setSelectedInventoryId(event.target.value ? Number(event.target.value) : '')}>
            <MenuItem value="">Do not link to inventory</MenuItem>
            {inventoryItems.map(item => (
              <MenuItem key={item.id} value={item.id}>{item.ingredient_name} ({item.unit})</MenuItem>
            ))}
          </TextField>
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
            {order.menurithm_inventory_item_id && (
              <Typography variant="body2" color="text.secondary">
                Receiving into {inventoryItems.find(item => item.id === order.menurithm_inventory_item_id)?.ingredient_name || 'linked kitchen inventory'}
              </Typography>
            )}
            <Typography fontWeight={650}>{methodName(order.method)} · {order.fee === null ? 'Awaiting fee quote' : `${order.currency} ${order.fee} delivery fee`}</Typography>
            {order.sale_total != null && <Typography>Produce: {order.currency} {order.produce_total} · Total: {order.currency} {order.sale_total}</Typography>}
            {order.stock_reserved && <Typography>Stock reserved</Typography>}
            {order.pickup_checkout_id && <Chip label={`Pickup #${order.pickup_checkout_id} · Pay farmer at pickup`} sx={{ alignSelf: 'flex-start' }} />}
            {order.payment_recorded_at && <Typography>Farmer recorded direct payment.</Typography>}
            {order.farmer_name && <Typography sx={{ overflowWrap: 'anywhere' }}>Farmer: {order.farmer_name} · {order.farmer_contact}</Typography>}
            <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {order.method === 'customer_pickup' ? `Pickup: ${order.pickup_address || 'Farmer will confirm location'}` : `Deliver to: ${order.delivery_address}`}
            </Typography>
            {order.instructions && <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{order.instructions}</Typography>}
            {order.stage === 'quoted' && <>
              <FormControlLabel sx={{ alignItems: 'flex-start', ml: -1 }} control={
                <Checkbox checked={accepted[order.id] === order.revision}
                  onChange={(_, checked) => setAccepted(previous => ({ ...previous, [order.id]: checked ? order.revision : 0 }))} />
              } label={`I accept the handover terms above (quote ${order.revision})${order.sale_total != null
                ? ` and the ${order.currency} ${order.sale_total} total.`
                : '. This older quote excludes produce pricing; confirm it with the farmer separately.'} Payment is arranged directly.`} />
              <Button sx={{ alignSelf: 'flex-start' }} variant="contained"
                disabled={busy || accepted[order.id] !== order.revision} onClick={() => accept(order)}>Accept these fulfillment terms</Button>
            </>}
            {(order.pickup_checkout_id
              ? order.stage === 'accepted' && orders.every(item => item.pickup_checkout_id !== order.pickup_checkout_id || item.stage === 'accepted')
              : ['requested', 'quoted', 'accepted', 'ready'].includes(order.stage)) &&
              <Button sx={{ alignSelf: 'flex-start' }} color="error" disabled={busy} onClick={() => void cancel(order)}>
                {order.pickup_checkout_id ? 'Cancel entire pickup order' : 'Cancel order'}
              </Button>}
            {order.menurithm_inventory_item_id && ['collected', 'delivered'].includes(order.stage) &&
              !order.inventory_received && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <TextField label={`Actual quantity received (${receiptUnits[order.id] ?? order.unit})`} type="number"
                    value={receiptQuantities[order.id] ?? String(order.quantity_needed)}
                    slotProps={{ htmlInput: { min: 0.000001, step: 'any' } }}
                    onChange={event => setReceiptQuantities(previous => ({
                      ...previous, [order.id]: event.target.value,
                    }))} />
                  <TextField label="Received unit" value={receiptUnits[order.id] ?? order.unit}
                    onChange={event => setReceiptUnits(previous => ({
                      ...previous, [order.id]: event.target.value,
                    }))} />
                  <Button variant="contained" disabled={busy}
                    onClick={() => void receive(order)}>Confirm receipt to inventory</Button>
                </Stack>
              )}
            {order.inventory_received && <>
              <Alert severity="success">Actual quantity was added to kitchen inventory and recorded in its history.</Alert>
              <Button variant="outlined" sx={{ alignSelf: 'flex-start' }}
                disabled={busy} onClick={() => void downloadReceipt(order)}>
                Download receiving receipt (PDF)
              </Button>
            </>}
          </Stack>
        </CardContent></Card>
      ))}
    </Stack>
  );
}
