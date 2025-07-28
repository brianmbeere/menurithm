import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  CircularProgress,
  Divider,
} from '@mui/material';
import { advancedInventoryAPI, type AIAnalytics, type SmartAlert } from '../api/advancedInventory';

interface AIAnalyticsDashboardProps {
  onOptimizationRequest?: () => void;
  onVoiceCommandStart?: () => void;
}

export const AIAnalyticsDashboard: React.FC<AIAnalyticsDashboardProps> = ({
  onOptimizationRequest,
  onVoiceCommandStart,
}) => {
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadAIData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(loadAIData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAIData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [analyticsData, alertsData] = await Promise.all([
        advancedInventoryAPI.getAnalytics(),
        advancedInventoryAPI.getAlerts('high'), // Get high priority alerts
      ]);
      
      setAnalytics(analyticsData);
      setAlerts(alertsData.alerts);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load AI data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load AI analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimization = async () => {
    try {
      await advancedInventoryAPI.runOptimization();
      if (onOptimizationRequest) {
        onOptimizationRequest();
      }
      // Refresh data after optimization
      setTimeout(loadAIData, 2000);
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  };

  const getAlertSeverity = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  if (loading && !analytics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading AI Analytics...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={loadAIData}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          🤖 AI Analytics Dashboard
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            onClick={onVoiceCommandStart}
            sx={{ mr: 1 }}
          >
            🎤 Voice Commands
          </Button>
          <Button variant="outlined" onClick={loadAIData} disabled={loading}>
            🔄 Refresh
          </Button>
        </Box>
      </Box>

      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Last updated: {lastUpdated.toLocaleString()}
        </Typography>
      )}

      <Grid container spacing={3}>
        {/* Optimization Score */}
        <Grid columns={{ xs: 12, md: 6, lg: 3 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Optimization Score
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="h3" component="div" color="primary.main">
                  {analytics?.optimization_score || 0}%
                </Typography>
                <Typography sx={{ ml: 1 }}>📈</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={analytics?.optimization_score || 0} 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Savings Potential */}
        <Grid columns={{ xs: 12, md: 6, lg: 3 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Potential Savings
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {analytics?.cost_savings_potential || '$0'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monthly projection
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Waste Reduction */}
        <Grid columns={{ xs: 12, md: 6, lg: 3 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Waste Reduction
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {analytics?.waste_reduction_percentage || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compared to baseline
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Alerts */}
        <Grid columns={{ xs: 12, md: 6, lg: 3 }}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Alerts
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {alerts.filter(alert => !alert.resolved).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Requires attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Smart Alerts */}
        <Grid columns={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '400px', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              🚨 Smart Alerts
            </Typography>
            
            {alerts.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="200px">
                <Typography sx={{ fontSize: 48, mb: 1 }}>✅</Typography>
                <Typography color="text.secondary">
                  No active alerts. Everything looks good!
                </Typography>
              </Box>
            ) : (
              <List>
                {alerts.map((alert, index) => (
                  <React.Fragment key={alert.id}>
                    <ListItem alignItems="flex-start" sx={{ pl: 0 }}>
                      <Box sx={{ mr: 2, mt: 0.5 }}>
                        <Typography>⚠️</Typography>
                      </Box>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {alert.message}
                            </Typography>
                            <Chip 
                              label={alert.priority} 
                              size="small" 
                              color={getAlertSeverity(alert.priority) as any}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Action:</strong> {alert.suggested_action}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(alert.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < alerts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Top Cost Saving Opportunities */}
        <Grid columns={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '400px', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              ✨ Cost Saving Opportunities
            </Typography>
            
            {analytics?.top_cost_saving_opportunities?.length ? (
              <List>
                {analytics.top_cost_saving_opportunities.map((opportunity, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start" sx={{ pl: 0 }}>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">
                              {opportunity.item}
                            </Typography>
                            <Chip 
                              label={opportunity.potential_savings} 
                              size="small" 
                              color="success"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {opportunity.recommendation}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < analytics.top_cost_saving_opportunities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
                No cost saving opportunities identified at this time.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Action Buttons */}
        <Grid columns={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              AI Actions
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                color="primary"
                onClick={handleOptimization}
                disabled={loading}
              >
                ✨ Run Full Optimization
              </Button>
              <Button
                variant="outlined"
                onClick={onVoiceCommandStart}
              >
                🎤 Voice Commands
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.open('/advanced-reports', '_blank')}
              >
                📊 Advanced Reports
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIAnalyticsDashboard;
