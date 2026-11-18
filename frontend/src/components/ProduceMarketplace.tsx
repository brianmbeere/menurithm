import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { fetchCroprithmProduce, type CroprithmProduceListing } from '../api/fetchCroprithmProduce';
import { authFetch } from '../hooks/authFetch';
import { BASE_URL } from '../utils';
import ProduceOrders from './ProduceOrders';

type CartLine = { listing: CroprithmProduceListing; quantity: string };
type Preview = {
  seller_name: string;
  produce_subtotal: string;
  lines: { listing_id: number; produce_type: string; quantity: string; unit: string; line_total: string }[];
};
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function ProduceMarketplace() {
  const [tab, setTab] = useState(0);
  const [listings, setListings] = useState<CroprithmProduceListing[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [cartError, setCartError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setCatalogError('');
      try {
        await getAuth().authStateReady();
        if (!active) return;
        const data = await fetchCroprithmProduce(search);
        if (active) setListings(data);
      } catch (error) {
        if (active) setCatalogError(error instanceof Error ? error.message : 'Unable to load listings.');
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  const updateCart = (lines: CartLine[]) => {
    setCart(lines);
    setPreview(null);
    setCartError('');
  };
  const add = (listing: CroprithmProduceListing) => {
    if (cart.some(line => line.listing.seller_id !== listing.seller_id)) {
      setCartError('Your cart is from another farm. Remove those items before shopping with this farm.');
      return;
    }
    if (cart.some(line => line.listing.id === listing.id)) return;
    const quantity = Math.min(1, Math.floor(listing.quantity_available * 1000) / 1000);
    if (quantity > 0) updateCart([...cart, { listing, quantity: String(quantity) }]);
  };
  const review = async () => {
    setReviewing(true);
    setCartError('');
    setPreview(null);
    try {
      const response = await authFetch(`${BASE_URL}/api/fulfillment/marketplace/checkout-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: cart.map(({ listing, quantity }) => ({ listing_id: listing.id, quantity })) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.detail === 'string' ? body.detail : 'Unable to review this cart.');
      }
      setPreview(await response.json());
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Unable to review this cart.');
    } finally { setReviewing(false); }
  };

  return <Stack spacing={3}>
    <Box sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText', borderRadius: 4, p: { xs: 3, md: 5 } }}>
      <Stack spacing={1} alignItems="flex-start">
        <Typography variant="overline">Menurithm sourcing / Croprithm farms</Typography>
        <Typography component="h1" variant="h4" fontWeight={750}>Produce marketplace</Typography>
        <Typography>Browse live farm listings and build a cart for your kitchen.</Typography>
      </Stack>
    </Box>
    <Tabs value={tab} onChange={(_, value: number) => setTab(value)} aria-label="Produce workspace">
      <Tab label="Shop produce" id="produce-shop-tab" aria-controls="produce-shop" />
      <Tab label="Orders & quotes" id="produce-orders-tab" aria-controls="produce-orders" />
    </Tabs>
    {tab === 1 ? <Box role="tabpanel" id="produce-orders" aria-labelledby="produce-orders-tab"><ProduceOrders /></Box> :
      <Stack role="tabpanel" id="produce-shop" aria-labelledby="produce-shop-tab" spacing={2}>
        <Alert severity="info">Checkout preview: no order, reservation, or charge is created. Use Orders & quotes to buy through the existing pilot.</Alert>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(290px, 360px)' }, gap: 3, alignItems: 'start' }}>
          <Stack spacing={2}>
            <TextField fullWidth size="small" label="Search produce" value={search}
              onChange={event => setSearch(event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
            {catalogError ? <Alert severity="error">{catalogError}</Alert> :
              loading ? <Typography role="status">Loading farm listings...</Typography> :
              listings.length === 0 ? <Typography>No matching in-stock listings.</Typography> :
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                {listings.map(listing => <Card key={listing.id} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Box sx={{ bgcolor: 'action.hover', px: 2, py: 2 }}>
                    <Typography variant="overline">{listing.seller_name}</Typography>
                    <Typography component="h2" variant="h6">{listing.produce_type}</Typography>
                  </Box>
                  <CardContent><Stack spacing={1}>
                    <Typography color="text.secondary">{[listing.variety, listing.location].filter(Boolean).join(' / ')}</Typography>
                    <Typography fontWeight={700}>{dollars.format(listing.price_per_unit)} / {listing.unit}</Typography>
                    <Typography variant="body2">{listing.quantity_available} {listing.unit} available</Typography>
                    {listing.organic && <Chip size="small" label="Organic" sx={{ alignSelf: 'flex-start' }} />}
                    {listing.description && <Typography variant="body2">{listing.description}</Typography>}
                    <Button variant="outlined" disabled={reviewing || listing.quantity_available < 0.001 || cart.length >= 50 || cart.some(line => line.listing.id === listing.id)}
                      onClick={() => add(listing)} aria-label={`Add ${listing.produce_type} from ${listing.seller_name} to cart`}>
                      {cart.some(line => line.listing.id === listing.id) ? 'In cart' : 'Add to cart'}
                    </Button>
                  </Stack></CardContent>
                </Card>)}
              </Box>}
          </Stack>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent><Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography component="h2" variant="h6">Your cart</Typography><Chip size="small" label={cart.length} />
              </Stack>
              <Typography variant="body2" color="text.secondary">{cart[0]?.listing.seller_name ?? 'Start by adding produce from one farm.'}</Typography>
              {cart.map(({ listing, quantity }) => <Stack key={listing.id} spacing={1}>
                <Divider />
                <Typography fontWeight={650}>{listing.produce_type} {listing.variety}</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField type="number" size="small" label={`Quantity (${listing.unit})`} value={quantity} disabled={reviewing}
                    slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }}
                    onChange={event => updateCart(cart.map(line => line.listing.id === listing.id ? { ...line, quantity: event.target.value } : line))} />
                  <Button disabled={reviewing} onClick={() => updateCart(cart.filter(line => line.listing.id !== listing.id))}>Remove</Button>
                </Stack>
              </Stack>)}
              {cartError && <Alert severity="error">{cartError}</Alert>}
              {!!cart.length && <Button variant="contained" disabled={reviewing || cart.some(line => !/^\d+(\.\d{1,3})?$/.test(line.quantity) || Number(line.quantity) <= 0)}
                onClick={() => void review()}>{reviewing ? 'Checking availability...' : 'Review checkout'}</Button>}
              {preview && <Stack spacing={1} aria-live="polite">
                <Divider />
                <Typography component="h3" variant="subtitle1" fontWeight={700}>Checkout preview: {preview.seller_name}</Typography>
                {preview.lines.map(line => <Typography key={line.listing_id} variant="body2">
                  {line.quantity} {line.unit} {line.produce_type}: {dollars.format(Number(line.line_total))}
                </Typography>)}
                <Typography fontWeight={750}>Produce subtotal: {dollars.format(Number(preview.produce_subtotal))}</Typography>
                <Typography variant="body2">Delivery, taxes, and service fees are not calculated in this preview.</Typography>
                <Button variant="outlined" disabled>Stripe Checkout not configured</Button>
                <Typography variant="caption">Availability was checked, but stock is not held.</Typography>
              </Stack>}
            </Stack></CardContent>
          </Card>
        </Box>
      </Stack>}
  </Stack>;
}
