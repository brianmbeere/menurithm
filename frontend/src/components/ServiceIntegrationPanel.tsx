import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  Card,
  CardContent,
  Divider,
  Chip,
  CircularProgress,
  Tab,
  Tabs,
  MenuItem,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { serviceIntegrationAPI, type ServiceDish } from '../api/serviceIntegration';
import { advancedInventoryAPI } from '../api/advancedInventory';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
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

interface ProduceOrder {
  request_id: number;
  restaurant_name: string;
  produce_type: string;
  quantity_needed: number;
  unit: string;
  status: string;
  created_at?: string;
}

const UNITS = ['kg', 'lbs', 'units', 'liters', 'bunches', 'boxes', 'crates'];

const ServiceIntegrationPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  
  // RouteCast integration status
  const [routecastConnected, setRoutecastConnected] = useState<boolean | null>(null);
  const [routecastDemoMode, setRoutecastDemoMode] = useState(false);
  
  // Dish creation
  const [dishData, setDishData] = useState<ServiceDish>(serviceIntegrationAPI.createDishTemplate());
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // RouteCast Produce
  const [routecastLoading, setRoutecastLoading] = useState(false);
  const [routecastError, setRoutecastError] = useState<string | null>(null);
  const [routecastSuccess, setRoutecastSuccess] = useState<string | null>(null);
  const [availableProduce, setAvailableProduce] = useState<ProduceItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<ProduceOrder[]>([]);
  
  // Produce order form
  const [restaurantName, setRestaurantName] = useState('');
  const [produceType, setProduceType] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unit, setUnit] = useState('kg');
  const [maxPricePerUnit, setMaxPricePerUnit] = useState<number | ''>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryWindowStart, setDeliveryWindowStart] = useState('');
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  useEffect(() => {
    checkIntegrationStatus();
    // Load saved values from localStorage
    const savedRestaurantName = localStorage.getItem('menurithm_restaurant_name');
    if (savedRestaurantName) setRestaurantName(savedRestaurantName);
    const savedDeliveryAddress = localStorage.getItem('menurithm_delivery_address');
    if (savedDeliveryAddress) setDeliveryAddress(savedDeliveryAddress);
  }, []);

  useEffect(() => {
    if (tabValue === 0) {
      fetchAvailableProduce();
    }
  }, [tabValue]);

  const checkIntegrationStatus = async () => {
    // Check RouteCast integration
    try {
      const result = await advancedInventoryAPI.getAvailableProduce() as any;
      setRoutecastConnected(true);
      setRoutecastDemoMode(result.demo_mode || false);
      setAvailableProduce(result.produce || []);
    } catch {
      setRoutecastConnected(false);
    }
  };

  const fetchAvailableProduce = async () => {
    try {
      setRoutecastLoading(true);
      setRoutecastError(null);
      const result = await advancedInventoryAPI.getAvailableProduce();
      setAvailableProduce(result.produce || []);
    } catch (err) {
      setRoutecastError(err instanceof Error ? err.message : 'Failed to fetch produce');
    } finally {
      setRoutecastLoading(false);
    }
  };

  const handleCreateProduceOrder = async () => {
    // Validation
    if (!restaurantName.trim()) {
      setRoutecastError('Restaurant name is required');
      return;
    }
    if (!produceType.trim()) {
      setRoutecastError('Produce type is required');
      return;
    }
    if (quantity <= 0) {
      setRoutecastError('Quantity must be greater than 0');
      return;
    }
    if (!deliveryAddress.trim()) {
      setRoutecastError('Delivery address is required');
      return;
    }
    if (!deliveryWindowStart || !deliveryWindowEnd) {
      setRoutecastError('Delivery window is required');
      return;
    }

    try {
      setRoutecastLoading(true);
      setRoutecastError(null);
      setRoutecastSuccess(null);

      // Save for future use
      localStorage.setItem('menurithm_restaurant_name', restaurantName);
      localStorage.setItem('menurithm_delivery_address', deliveryAddress);

      const orderData = {
        restaurant_name: restaurantName,
        produce_type: produceType,
        quantity_needed: quantity,
        unit: unit,
        delivery_address: deliveryAddress,
        delivery_window_start: new Date(deliveryWindowStart).toISOString(),
        delivery_window_end: new Date(deliveryWindowEnd).toISOString(),
        max_price_per_unit: maxPricePerUnit || undefined,
        special_requirements: specialRequirements || undefined,
      };

      const result = await advancedInventoryAPI.createProduceOrder(orderData);
      
      if (result.success) {
        setRoutecastSuccess(`✅ Order created! Request ID: ${result.request_id} - ${result.message}`);
        // Add to recent orders
        setRecentOrders(prev => [{
          request_id: result.request_id,
          restaurant_name: restaurantName,
          produce_type: produceType,
          quantity_needed: quantity,
          unit: unit,
          status: result.status,
          created_at: new Date().toISOString()
        }, ...prev.slice(0, 9)]);
        // Reset some fields
        setProduceType('');
        setQuantity(10);
        setMaxPricePerUnit('');
        setSpecialRequirements('');
      } else {
        setRoutecastError(result.message || 'Failed to create order');
      }
    } catch (err) {
      setRoutecastError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setRoutecastLoading(false);
    }
  };

  const handleCreateDish = async () => {
    try {
      setCreateLoading(true);
      setCreateResult(null);
      
      const validation = serviceIntegrationAPI.validateDishData(dishData);
      if (!validation.valid) {
        setError(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      const result = await serviceIntegrationAPI.createDishService(dishData);
      setCreateResult(`✅ Dish created successfully! ID: ${result.dish_id}`);
      setDishData(serviceIntegrationAPI.createDishTemplate()); // Reset form
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create dish');
    } finally {
      setCreateLoading(false);
    }
  };

  const updateDishField = (field: keyof ServiceDish, value: any) => {
    setDishData(prev => ({ ...prev, [field]: value }));
  };

  const addIngredient = () => {
    setDishData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: 0, unit: '' }]
    }));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    setDishData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const removeIngredient = (index: number) => {
    setDishData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🔧 Service Integrations
      </Typography>
      
      {/* Integration Status Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* RouteCast Integration */}
        <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
          <Card 
            sx={{ 
              borderLeft: 4, 
              borderColor: routecastConnected === null ? 'grey.400' : routecastConnected ? 'success.main' : 'error.main' 
            }}
          >
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    RouteCast
                  </Typography>
                  <Typography variant="h6">
                    Produce Supplier
                  </Typography>
                </Box>
                <Box textAlign="right">
                  {routecastConnected === null ? (
                    <CircularProgress size={20} />
                  ) : routecastConnected ? (
                    <>
                      <Chip 
                        label={routecastDemoMode ? "Demo" : "Live"} 
                        size="small" 
                        color={routecastDemoMode ? "warning" : "success"} 
                      />
                      <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                        {availableProduce.length} items available
                      </Typography>
                    </>
                  ) : (
                    <Chip label="Offline" size="small" color="error" />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Menurithm API */}
        <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Menurithm
                  </Typography>
                  <Typography variant="h6">
                    Core API
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Chip label="Active" size="small" color="success" />
                  <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                    v1.0
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* AI Analytics */}
        <Grid columns={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    OpenAI
                  </Typography>
                  <Typography variant="h6">
                    AI Analytics
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Chip label="Demo" size="small" color="warning" />
                  <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                    Configure API key
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different integrations */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="🥬 RouteCast Produce" />
          <Tab label="🍽️ Service Dish Creation" />
        </Tabs>
      </Paper>

      {/* RouteCast Produce Tab */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              RouteCast Produce Requests
              <Chip label="RouteCast" size="small" color="success" variant="outlined" sx={{ ml: 1 }} />
            </Typography>
            <Button variant="outlined" onClick={fetchAvailableProduce} disabled={routecastLoading}>
              Refresh Produce
            </Button>
          </Box>

          {routecastError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRoutecastError(null)}>
              {routecastError}
            </Alert>
          )}

          {routecastSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setRoutecastSuccess(null)}>
              {routecastSuccess}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Order Form */}
            <Grid columns={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Create Produce Request
                  </Typography>
                  
                  <TextField
                    fullWidth
                    required
                    label="Restaurant Name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    margin="normal"
                    helperText="Your restaurant name for the order"
                  />
                  
                  <TextField
                    fullWidth
                    required
                    label="Delivery Address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    margin="normal"
                  />

                  <Divider sx={{ my: 2 }} />
                  
                  <Autocomplete
                    freeSolo
                    options={availableProduce.map(p => ({
                      label: `${p.produce_type}${p.variety ? ` - ${p.variety}` : ''} ($${p.price_per_unit}/${p.unit})`,
                      value: p.produce_type,
                      item: p,
                    }))}
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
                    onInputChange={(_, newInputValue) => setProduceType(newInputValue)}
                    renderInput={(params) => (
                      <TextField {...params} required label="Produce Type" margin="normal" />
                    )}
                  />

                  <Box display="flex" gap={2}>
                    <TextField
                      required
                      type="number"
                      label="Quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      inputProps={{ min: 1 }}
                      margin="normal"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      select
                      label="Unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      margin="normal"
                      sx={{ flex: 1 }}
                    >
                      {UNITS.map((u) => (
                        <MenuItem key={u} value={u}>{u}</MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  <TextField
                    fullWidth
                    type="number"
                    label="Max Price per Unit ($)"
                    value={maxPricePerUnit}
                    onChange={(e) => setMaxPricePerUnit(e.target.value ? Number(e.target.value) : '')}
                    inputProps={{ min: 0, step: 0.01 }}
                    margin="normal"
                    helperText="Optional - leave blank for any price"
                  />

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Delivery Window
                  </Typography>

                  <Box display="flex" gap={2}>
                    <TextField
                      required
                      type="datetime-local"
                      label="Start"
                      value={deliveryWindowStart}
                      onChange={(e) => setDeliveryWindowStart(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      margin="normal"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      required
                      type="datetime-local"
                      label="End"
                      value={deliveryWindowEnd}
                      onChange={(e) => setDeliveryWindowEnd(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      margin="normal"
                      sx={{ flex: 1 }}
                    />
                  </Box>

                  <TextField
                    fullWidth
                    label="Special Requirements"
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    margin="normal"
                    multiline
                    rows={2}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={handleCreateProduceOrder}
                    disabled={routecastLoading}
                    startIcon={routecastLoading ? <CircularProgress size={16} /> : undefined}
                    sx={{ mt: 2 }}
                  >
                    {routecastLoading ? 'Creating Order...' : '🥬 Create Produce Request'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Available Produce & Recent Orders */}
            <Grid columns={{ xs: 12, md: 6 }}>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Available Produce ({availableProduce.length})
                  </Typography>
                  {routecastLoading ? (
                    <Box display="flex" justifyContent="center" py={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : availableProduce.length > 0 ? (
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {availableProduce.map((p) => (
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
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No produce available. Click Refresh to load.
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {recentOrders.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Recent Orders
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>ID</TableCell>
                          <TableCell>Produce</TableCell>
                          <TableCell>Qty</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentOrders.map((order) => (
                          <TableRow key={order.request_id}>
                            <TableCell>#{order.request_id}</TableCell>
                            <TableCell>{order.produce_type}</TableCell>
                            <TableCell>{order.quantity_needed} {order.unit}</TableCell>
                            <TableCell>
                              <Chip 
                                label={order.status} 
                                size="small" 
                                color={order.status === 'pending' ? 'warning' : 'success'} 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>

      {/* Service Dish Creation Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Service-to-Service Dish Creation
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create dishes programmatically using API key authentication. 
          This bypasses normal user authentication for automated workflows.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {createResult && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCreateResult(null)}>
            {createResult}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid columns={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Basic Information
                </Typography>
                
                <TextField
                  fullWidth
                  label="Dish Name"
                  value={dishData.name}
                  onChange={(e) => updateDishField('name', e.target.value)}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={dishData.description}
                  onChange={(e) => updateDishField('description', e.target.value)}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={dishData.price}
                  onChange={(e) => updateDishField('price', parseFloat(e.target.value) || 0)}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Category"
                  value={dishData.category}
                  onChange={(e) => updateDishField('category', e.target.value)}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Preparation Time (minutes)"
                  type="number"
                  value={dishData.preparation_time || ''}
                  onChange={(e) => updateDishField('preparation_time', parseInt(e.target.value) || undefined)}
                  margin="normal"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Ingredients */}
          <Grid columns={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">
                    Ingredients
                  </Typography>
                  <Button size="small" onClick={addIngredient}>
                    Add Ingredient
                  </Button>
                </Box>
                
                {dishData.ingredients.map((ingredient, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <TextField
                      fullWidth
                      label="Ingredient Name"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      size="small"
                      margin="dense"
                    />
                    <Box display="flex" gap={1} mt={1}>
                      <TextField
                        label="Quantity"
                        type="number"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Unit"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <Button 
                        color="error" 
                        onClick={() => removeIngredient(index)}
                        size="small"
                      >
                        Remove
                      </Button>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            This will create the dish using service-to-service authentication
          </Typography>
          <Button
            variant="contained"
            onClick={handleCreateDish}
            disabled={createLoading}
            startIcon={createLoading ? <CircularProgress size={16} /> : undefined}
          >
            {createLoading ? 'Creating...' : 'Create Dish'}
          </Button>
        </Box>
      </Paper>
      </TabPanel>
    </Box>
  );
};

export default ServiceIntegrationPanel;
