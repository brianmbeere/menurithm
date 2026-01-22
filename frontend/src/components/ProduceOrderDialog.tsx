import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Autocomplete,
} from '@mui/material';
import { advancedInventoryAPI } from '../api/advancedInventory';

interface ProduceOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

interface ProduceItem {
  id: number;
  produce_type: string;
  variety?: string;
  quantity_available: number;
  unit: string;
  price_per_unit: number;
  location: string;
  organic: boolean;
  is_available: boolean;
}

const UNITS = ['kg', 'lbs', 'units', 'liters', 'bunches', 'boxes', 'crates'];

export const ProduceOrderDialog: React.FC<ProduceOrderDialogProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableProduce, setAvailableProduce] = useState<ProduceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [restaurantName, setRestaurantName] = useState('');
  const [produceType, setProduceType] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unit, setUnit] = useState('kg');
  const [maxPricePerUnit, setMaxPricePerUnit] = useState<number | ''>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryWindowStart, setDeliveryWindowStart] = useState('');
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [organicPreferred, setOrganicPreferred] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableProduce();
      // Load saved restaurant name from localStorage
      const savedRestaurantName = localStorage.getItem('menurithm_restaurant_name');
      if (savedRestaurantName) {
        setRestaurantName(savedRestaurantName);
      }
      const savedDeliveryAddress = localStorage.getItem('menurithm_delivery_address');
      if (savedDeliveryAddress) {
        setDeliveryAddress(savedDeliveryAddress);
      }
    }
  }, [open]);

  const fetchAvailableProduce = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await advancedInventoryAPI.getAvailableProduce();
      setAvailableProduce(result.produce || []);
    } catch (err) {
      console.error('Failed to fetch available produce:', err);
      setError('Failed to load available produce from RouteCast');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!restaurantName.trim()) {
      setError('Restaurant name is required');
      return;
    }
    if (!produceType.trim()) {
      setError('Produce type is required');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (!deliveryAddress.trim()) {
      setError('Delivery address is required');
      return;
    }
    if (!deliveryWindowStart) {
      setError('Delivery window start is required');
      return;
    }
    if (!deliveryWindowEnd) {
      setError('Delivery window end is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Save restaurant name and address for future use
      localStorage.setItem('menurithm_restaurant_name', restaurantName);
      if (deliveryAddress) {
        localStorage.setItem('menurithm_delivery_address', deliveryAddress);
      }

      const orderData = {
        restaurant_name: restaurantName,
        produce_type: produceType,
        quantity_needed: quantity,
        unit: unit,
        max_price_per_unit: maxPricePerUnit || undefined,
        delivery_address: deliveryAddress,
        delivery_window_start: new Date(deliveryWindowStart).toISOString(),
        delivery_window_end: new Date(deliveryWindowEnd).toISOString(),
        special_requirements: specialRequirements || undefined,
        organic_preferred: organicPreferred,
      };

      const result = await advancedInventoryAPI.createProduceOrder(orderData);
      onSuccess(result);
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setProduceType('');
    setQuantity(10);
    setUnit('kg');
    setMaxPricePerUnit('');
    setDeliveryWindowStart('');
    setDeliveryWindowEnd('');
    setSpecialRequirements('');
    setOrganicPreferred(false);
    onClose();
  };

  const produceOptions = availableProduce.map(p => ({
    label: `${p.produce_type}${p.variety ? ` - ${p.variety}` : ''} (${p.quantity_available} ${p.unit} @ $${p.price_per_unit}/${p.unit})`,
    value: p.produce_type,
    item: p,
  }));

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          🥬 Create Produce Order
          <Chip label="RouteCast" size="small" color="success" variant="outlined" />
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Restaurant Information */}
            <Grid columns={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Restaurant Information
              </Typography>
            </Grid>
            <Grid columns={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Restaurant Name"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g., Bella's Bistro"
                helperText="Your restaurant name for the order"
              />
            </Grid>
            <Grid columns={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Delivery Address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="e.g., 123 Main St, City"
              />
            </Grid>

            {/* Delivery Window */}
            <Grid columns={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                Delivery Window
              </Typography>
            </Grid>
            <Grid columns={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                type="datetime-local"
                label="Delivery Window Start"
                value={deliveryWindowStart}
                onChange={(e) => setDeliveryWindowStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="When delivery can start"
              />
            </Grid>
            <Grid columns={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                type="datetime-local"
                label="Delivery Window End"
                value={deliveryWindowEnd}
                onChange={(e) => setDeliveryWindowEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="When delivery must complete"
              />
            </Grid>

            {/* Order Details */}
            <Grid columns={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                Order Details
              </Typography>
            </Grid>
            <Grid columns={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                options={produceOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                value={produceType}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    setProduceType(newValue);
                  } else if (newValue) {
                    setProduceType(newValue.value);
                    setUnit(newValue.item.unit);
                    setMaxPricePerUnit(newValue.item.price_per_unit);
                  }
                }}
                onInputChange={(_, newInputValue) => {
                  setProduceType(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Produce Type"
                    placeholder="e.g., Tomatoes, Chicken, etc."
                    helperText={availableProduce.length > 0 ? "Select from available or enter custom" : "Enter produce type"}
                  />
                )}
              />
            </Grid>
            <Grid columns={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth
                required
                type="number"
                label="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid columns={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth
                select
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNITS.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid columns={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Max Price per Unit ($)"
                value={maxPricePerUnit}
                onChange={(e) => setMaxPricePerUnit(e.target.value ? Number(e.target.value) : '')}
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Optional - leave blank for any price"
              />
            </Grid>
            <Grid columns={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                select
                label="Organic Preference"
                value={organicPreferred ? 'yes' : 'no'}
                onChange={(e) => setOrganicPreferred(e.target.value === 'yes')}
              >
                <MenuItem value="no">No preference</MenuItem>
                <MenuItem value="yes">Prefer organic</MenuItem>
              </TextField>
            </Grid>
            <Grid columns={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Special Requirements"
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                placeholder="e.g., Cherry tomatoes preferred"
              />
            </Grid>

            {/* Available Produce Preview */}
            {availableProduce.length > 0 && (
              <Grid columns={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Available from RouteCast Suppliers ({availableProduce.length} items)
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {availableProduce.slice(0, 10).map((p) => (
                    <Chip
                      key={p.id}
                      label={`${p.produce_type} - $${p.price_per_unit}/${p.unit}`}
                      size="small"
                      color={p.is_available ? 'success' : 'default'}
                      variant="outlined"
                      onClick={() => {
                        setProduceType(p.produce_type);
                        setUnit(p.unit);
                        setMaxPricePerUnit(p.price_per_unit);
                      }}
                    />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting || !restaurantName || !produceType || quantity <= 0}
          startIcon={submitting ? <CircularProgress size={20} /> : null}
        >
          {submitting ? 'Creating Order...' : 'Create Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProduceOrderDialog;
