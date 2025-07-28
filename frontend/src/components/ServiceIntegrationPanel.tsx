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
} from '@mui/material';
import { serviceIntegrationAPI, type ServiceDish, type ServiceConnectionTest } from '../api/serviceIntegration';

const ServiceIntegrationPanel: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ServiceConnectionTest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dishData, setDishData] = useState<ServiceDish>(serviceIntegrationAPI.createDishTemplate());
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await serviceIntegrationAPI.testConnection();
      
      // Validate the response structure
      if (status && typeof status === 'object') {
        setConnectionStatus(status);
      } else {
        throw new Error('Invalid response format from connection test');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection test failed');
      setConnectionStatus(null);
    } finally {
      setLoading(false);
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
        🔧 Service Integration Panel
      </Typography>
      
      {/* Connection Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Connection Status
        </Typography>
        
        {loading ? (
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography>Testing connection...</Typography>
          </Box>
        ) : connectionStatus ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ Connected to {connectionStatus.service_name || 'Unknown Service'} (API v{connectionStatus.api_version || 'Unknown'})
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Last tested: {connectionStatus.timestamp ? new Date(connectionStatus.timestamp).toLocaleString() : 'Unknown time'}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Available Features:</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {connectionStatus.features_available && connectionStatus.features_available.length > 0 ? (
                  connectionStatus.features_available.map((feature, index) => (
                    <Chip key={index} label={feature} size="small" variant="outlined" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No features available or feature list not provided
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        ) : (
          <Alert severity="error">
            ❌ Connection failed
          </Alert>
        )}
        
        <Button 
          variant="outlined" 
          onClick={testConnection} 
          disabled={loading}
          sx={{ mt: 2 }}
        >
          Test Connection
        </Button>
      </Paper>

      {/* Service Dish Creator */}
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
            disabled={createLoading || !connectionStatus?.connected}
            startIcon={createLoading ? <CircularProgress size={16} /> : undefined}
          >
            {createLoading ? 'Creating...' : 'Create Dish'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ServiceIntegrationPanel;
