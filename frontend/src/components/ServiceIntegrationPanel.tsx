import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { serviceIntegrationAPI, type ServiceDish } from '../api/serviceIntegration';
import ProduceOrders from './ProduceOrders';

export default function ServiceIntegrationPanel() {
  const [tab, setTab] = useState(0);
  const [dish, setDish] = useState<ServiceDish>(serviceIntegrationAPI.createDishTemplate());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const field = <K extends keyof ServiceDish>(key: K, value: ServiceDish[K]) =>
    setDish(previous => ({ ...previous, [key]: value }));
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    const validation = serviceIntegrationAPI.validateDishData(dish);
    if (!validation.valid) { setError(validation.errors.join(', ')); return; }
    setBusy(true);
    try {
      const result = await serviceIntegrationAPI.createDishService(dish);
      setNotice(`Dish created. ID: ${result.dish_id}`);
      setDish(serviceIntegrationAPI.createDishTemplate());
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create dish'); }
    finally { setBusy(false); }
  };
  return <Stack spacing={3}>
    <Box><Typography variant="overline" color="primary">Connected kitchen</Typography>
      <Typography variant="h4">Service integrations</Typography>
      <Typography color="text.secondary">Source from farmers or manage your automated dish workflow.</Typography></Box>
    <Tabs value={tab} onChange={(_, value: number) => setTab(value)} aria-label="Service integrations">
      <Tab label="Croprithm produce" id="integration-tab-0" aria-controls="integration-panel-0" />
      <Tab label="Service dish creation" id="integration-tab-1" aria-controls="integration-panel-1" />
    </Tabs>
    <Box role="tabpanel" id={`integration-panel-${tab}`} aria-labelledby={`integration-tab-${tab}`}>
      {tab === 0 ? <ProduceOrders /> :
        <Card><CardContent><Stack component="form" onSubmit={create} spacing={2}>
          <Typography variant="h6">Service-to-service dish creation</Typography>
          <Alert severity="info">This existing workflow uses service API authentication. For normal kitchen editing, use Dishes in your workspace.</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField required label="Dish name" value={dish.name} onChange={e => field('name', e.target.value)} />
            <TextField label="Category" value={dish.category} onChange={e => field('category', e.target.value)} />
            <TextField required label="Price" type="number" value={dish.price} onChange={e => field('price', Number(e.target.value))}
              slotProps={{ htmlInput: { min: 0, step: '0.01' } }} />
            <TextField label="Preparation time (minutes)" type="number" value={dish.preparation_time || ''}
              onChange={e => field('preparation_time', e.target.value ? Number(e.target.value) : undefined)} />
          </Box>
          <TextField label="Description" multiline minRows={2} value={dish.description} onChange={e => field('description', e.target.value)} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Ingredients</Typography>
            <Button onClick={() => field('ingredients', [...dish.ingredients, { name: '', quantity: 0, unit: '' }])}>Add ingredient</Button>
          </Stack>
          {dish.ingredients.map((ingredient, index) => <Box key={index}
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr auto' }, gap: 1 }}>
            <TextField label="Ingredient name" value={ingredient.name} onChange={e => field('ingredients',
              dish.ingredients.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
            <TextField label="Quantity" type="number" value={ingredient.quantity} onChange={e => field('ingredients',
              dish.ingredients.map((item, i) => i === index ? { ...item, quantity: Number(e.target.value) } : item))} />
            <TextField label="Unit" value={ingredient.unit} onChange={e => field('ingredients',
              dish.ingredients.map((item, i) => i === index ? { ...item, unit: e.target.value } : item))} />
            <Button color="error" onClick={() => field('ingredients', dish.ingredients.filter((_, i) => i !== index))}>Remove</Button>
          </Box>)}
          <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>{busy ? 'Creating...' : 'Create dish'}</Button>
        </Stack></CardContent></Card>}
    </Box>
  </Stack>;
}
