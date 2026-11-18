import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, MenuItem, Skeleton, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { fetchCroprithmProduce, type CroprithmProduceListing } from '../api/fetchCroprithmProduce';
import { authFetch } from '../hooks/authFetch';
import { BASE_URL } from '../utils';
import { PageHeading, WorkspaceIcon } from './WorkspaceUI';
import ProduceOrders from './ProduceOrders';
import ProduceArtwork from './ProduceArtwork';

type CartLine = { listing: CroprithmProduceListing; quantity: string };
type Preview = {
  seller_name: string;
  produce_subtotal: string;
  payment_method?: string;
  pickup_windows?: { id: number; address: string; starts_at: string; ends_at: string }[];
  lines: { listing_id: number; produce_type: string; quantity: string; unit: string; line_total: string }[];
};
type Checkout = { id: number; state: 'placed' | 'canceled'; produce_subtotal: string };
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const displayDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString();

export default function ProduceMarketplace() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('view') === 'orders' ? 1 : 0;
  const setTab = (next: number) => {
    const updated = new URLSearchParams(params);
    if (next === 1) updated.set('view', 'orders');
    else updated.delete('view');
    setParams(updated);
  };
  const [listings, setListings] = useState<CroprithmProduceListing[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [cartError, setCartError] = useState('');
  const [windowId, setWindowId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [attempt, setAttempt] = useState('');
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [detail, setDetail] = useState<CroprithmProduceListing | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [listingError, setListingError] = useState('');
  const [sort, setSort] = useState('recommended');
  const visibleListings = sort === 'recommended' ? listings : [...listings].sort((a, b) =>
    a.produce_type.localeCompare(b.produce_type) || a.seller_name.localeCompare(b.seller_name));

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
  }, [search, catalogRetry]);

  const updateCart = (lines: CartLine[]) => {
    setCart(lines);
    setPreview(null);
    setCheckout(null);
    setAttempt('');
    setWindowId('');
    setCartError('');
  };
  const add = (listing: CroprithmProduceListing) => {
    if (cart.some(line => line.listing.seller_id !== listing.seller_id)) {
      setListingError('Your cart is from another farm. Remove those items before shopping with this farm.');
      return;
    }
    if (cart.some(line => line.listing.id === listing.id)) return;
    const quantity = Math.floor(Math.min(1, listing.quantity_available) * 1000) / 1000;
    if (quantity > 0) {
      updateCart([...cart, { listing, quantity: String(quantity) }]);
      setListingError('');
      setAnnouncement(`${listing.produce_type} from ${listing.seller_name} added to cart.`);
    }
  };
  const inCart = (listing: CroprithmProduceListing) => cart.some(line => line.listing.id === listing.id);
  const addButton = (listing: CroprithmProduceListing) => (
    <Button fullWidth variant="outlined" disabled={!inCart(listing) && (reviewing || listing.quantity_available < 0.001 || cart.length >= 50)}
      aria-disabled={inCart(listing) || undefined} sx={{ '&[aria-disabled="true"]': { color: 'text.secondary', cursor: 'default' } }}
      onClick={() => add(listing)} aria-label={inCart(listing) ? undefined : `Add ${listing.produce_type} from ${listing.seller_name} to cart`}>
      {inCart(listing) ? 'In cart' : 'Add to cart'}
    </Button>
  );
  const review = async () => {
    setReviewing(true);
    setCartError('');
    setPreview(null);
    setAttempt('');
    setWindowId('');
    setCheckout(null);
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

  const placePickup = async () => {
    if (!preview || !windowId || !restaurantName.trim() || reviewing) return;
    setReviewing(true);
    setCartError('');
    try {
      const base = `${BASE_URL}/api/fulfillment/marketplace/pickup-checkouts`;
      const key = attempt || crypto.randomUUID();
      setAttempt(key);
      const response = await authFetch(base, {
        method: 'POST',
        body: JSON.stringify({
          window_id: Number(windowId), attempt_key: key, restaurant_name: restaurantName,
          expected_subtotal: preview.produce_subtotal,
          lines: cart.map(({ listing, quantity }) => ({ listing_id: listing.id, quantity })),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.detail === 'string' ? body.detail : 'Unable to place the pickup order.');
      }
      const updated: Checkout = await response.json();
      setCheckout(updated);
      setCart([]);
      setPreview(null);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Unable to place the pickup order. Retry the same cart or check Orders & quotes before placing another order.');
    } finally { setReviewing(false); }
  };

  return <Stack spacing={3}>
    <PageHeading icon="shop" title="Produce marketplace"
      description={tab === 0 ? "Browse Croprithm farms and pay the farmer at pickup." : "Track orders and review custom quotes."}
      actions={<Button variant="contained" startIcon={<WorkspaceIcon name="cart" />} aria-haspopup="dialog"
        onClick={() => { setListingError(''); setCartOpen(true); }}>Cart ({cart.length})</Button>} />
    <Tabs value={tab} onChange={(_, value: number) => setTab(value)} aria-label="Produce workspace" variant="scrollable">
      <Tab label="Shop produce" id="produce-shop-tab" aria-controls="produce-shop" />
      <Tab label="Orders & quotes" id="produce-orders-tab" aria-controls="produce-orders" />
    </Tabs>
    {tab === 1 ? <Box role="tabpanel" id="produce-orders" aria-labelledby="produce-orders-tab"><ProduceOrders /></Box> :
      <Stack role="tabpanel" id="produce-shop" aria-labelledby="produce-shop-tab" spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
          <TextField fullWidth size="small" label="Search produce" value={search}
            onChange={event => setSearch(event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
          <TextField select size="small" label="Sort listings" value={sort} onChange={event => setSort(event.target.value)}
            sx={{ minWidth: { sm: 175 } }}>
            <MenuItem value="recommended">Default order</MenuItem>
            <MenuItem value="name">Produce name A–Z</MenuItem>
          </TextField>
        </Stack>
        {listingError && !detail && <Alert severity="warning" onClose={() => setListingError('')}>{listingError}</Alert>}
        <Box role="status" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>{announcement}</Box>
        <Typography component="h2" variant="subtitle1" fontWeight={750}>Available produce{!loading && !catalogError ? ` (${visibleListings.length})` : ''}</Typography>
        {catalogError ? <Alert severity="error" action={<Button color="inherit" onClick={() => setCatalogRetry(value => value + 1)}>Retry</Button>}>{catalogError}</Alert> :
          <Box aria-busy={loading} sx={{
            display: 'grid', gap: { xs: 1.5, sm: 2.5 },
            gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(min(100%, 136px), 1fr))', sm: 'repeat(auto-fill, minmax(185px, 1fr))' },
          }}>
            {loading ? Array.from({ length: 4 }, (_, index) =>
              <Skeleton key={index} variant="rounded" sx={{ height: 'auto', aspectRatio: '3 / 4', borderRadius: 3 }} />
            ) : visibleListings.length === 0 ? <Stack sx={{ gridColumn: '1 / -1', p: 2 }} alignItems="flex-start">
              <Typography>{search.trim() ? "No in-stock listings match your search." : "No produce is listed in stock right now."}</Typography>
              {search && <Button onClick={() => setSearch('')}>Clear search</Button>}
            </Stack> :
              visibleListings.map(listing => <Card key={listing.id} component="article" variant="outlined" sx={{
                display: 'flex', flexDirection: 'column', borderRadius: 3,
                transition: 'box-shadow 180ms ease, border-color 180ms ease',
                '&:hover, &:focus-within': { boxShadow: 3, borderColor: 'primary.light' },
              }}>
                <CardActionArea onClick={() => { setListingError(''); setDetail(listing); }} aria-haspopup="dialog"
                  aria-label={`View ${listing.produce_type} from ${listing.seller_name}`}
                  sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
                  <ProduceArtwork produce={listing.produce_type} illustration={listing.illustration} />
                  <CardContent sx={{ width: '100%', minWidth: 0, p: { xs: 1.5, sm: 2 }, overflowWrap: 'anywhere' }}>
                    <Typography component="h3" variant="subtitle1" noWrap fontWeight={750}>{listing.produce_type}</Typography>
                    <Typography variant="body2" noWrap color="text.secondary">{listing.seller_name}</Typography>
                    <Typography fontWeight={750} sx={{ mt: 1 }}>
                      {dollars.format(listing.price_per_unit)} <Typography component="span" variant="caption" color="text.secondary">/ {listing.unit}</Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{listing.quantity_available} {listing.unit} available</Typography>
                  </CardContent>
                </CardActionArea>
                <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: { xs: 1.5, sm: 2 } }}>{addButton(listing)}</Box>
              </Card>)}
          </Box>}
      </Stack>}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} aria-labelledby="marketplace-product-title" fullWidth maxWidth="sm">
        {detail && <>
          <DialogTitle id="marketplace-product-title">{detail.produce_type}</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Box sx={{ borderRadius: 3, overflow: 'hidden', maxWidth: 340, width: '100%', alignSelf: 'center' }}>
                <ProduceArtwork produce={detail.produce_type} illustration={detail.illustration} />
              </Box>
              <Typography variant="caption" color="text.secondary">Illustration, not a photo of this listing</Typography>
              <Typography variant="subtitle1" fontWeight={750}>{dollars.format(detail.price_per_unit)} / {detail.unit}</Typography>
              <Typography>{detail.seller_name}{detail.location ? ` · ${detail.location}` : ''}</Typography>
              <Typography variant="body2" color="text.secondary">{detail.quantity_available} {detail.unit} available</Typography>
              {detail.variety && <Typography variant="body2">Variety: {detail.variety}</Typography>}
              {detail.harvest_date && <Typography variant="body2">Harvest date: {displayDate(detail.harvest_date)}</Typography>}
              {detail.expiry_date && <Typography variant="body2">Expiry date: {displayDate(detail.expiry_date)}</Typography>}
              {detail.organic && <Chip size="small" label="Organic" sx={{ alignSelf: 'flex-start' }} />}
              {detail.description && <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{detail.description}</Typography>}
              {listingError && <Alert severity="warning">{listingError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDetail(null)}>Close</Button>
            <Box>{addButton(detail)}</Box>
          </DialogActions>
        </>}
      </Dialog>
      <Drawer anchor="right" open={cartOpen} onClose={() => setCartOpen(false)}
        slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'marketplace-cart-title', sx: { width: 'min(100%, 440px)' } } }}>
        <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography component="h2" id="marketplace-cart-title" variant="h6">Your cart ({cart.length})</Typography>
                <Button onClick={() => setCartOpen(false)}>Close cart</Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">{cart[0]?.listing.seller_name ?? 'Start by adding produce from one farm.'}</Typography>
              {cart.map(({ listing, quantity }) => <Stack key={listing.id} spacing={1}>
                <Divider />
                <Button aria-haspopup="dialog" aria-label={`View ${listing.produce_type} listing details`}
                  sx={{ alignSelf: 'flex-start', textAlign: 'left', px: 0 }}
                  onClick={() => { setListingError(''); setDetail(listing); }}>
                  {listing.produce_type}{listing.variety ? ` · ${listing.variety}` : ''}
                </Button>
                <Stack direction="row" spacing={1}>
                  <TextField fullWidth type="number" size="small" label={`Quantity (${listing.unit})`} value={quantity} disabled={reviewing}
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
                <Typography variant="body2">Pickup only. No online payment or platform fee. Applicable taxes are not calculated here.</Typography>
                {preview.payment_method !== 'pay_at_pickup' ? <Alert severity="info">Pickup checkout is not available. Use Orders &amp; quotes.</Alert>
                : !preview.pickup_windows?.length ? <Alert severity="info">This farm has no upcoming pickup windows. Use Orders &amp; quotes to make a request.</Alert> : <>
                  <TextField select label="Pickup window" value={windowId} disabled={reviewing}
                    onChange={event => { setWindowId(event.target.value); setAttempt(''); setCheckout(null); }}>
                    {preview.pickup_windows.map(window => <MenuItem key={window.id} value={String(window.id)} sx={{ whiteSpace: 'normal' }}>
                      {new Date(window.starts_at).toLocaleString()} to {new Date(window.ends_at).toLocaleString()} / {window.address}
                    </MenuItem>)}
                  </TextField>
                  <TextField label="Restaurant name" value={restaurantName} disabled={reviewing}
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                    onChange={event => { setRestaurantName(event.target.value); setAttempt(''); setCheckout(null); }} />
                  <Button variant="contained" disabled={reviewing || !windowId || !restaurantName.trim()}
                    onClick={() => void placePickup()}>Place order · pay at pickup</Button>
                </>}
              </Stack>}
              {checkout?.state === 'placed' && <Alert severity="success">Pickup order #{checkout.id} placed. Pay the farmer at pickup.
                <Button color="inherit" onClick={() => { setCartOpen(false); setTab(1); }}>View orders</Button>
              </Alert>}
              {checkout?.state === 'canceled' && <Alert severity="info">That pickup order was canceled. Review the cart to start a new checkout.</Alert>}
        </Stack>
      </Drawer>
  </Stack>;
}
