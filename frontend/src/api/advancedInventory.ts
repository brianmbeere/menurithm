import { apiClient, MenurithmAPIClient } from './client';

export interface AIAnalytics {
  optimization_score: number;
  cost_savings_potential: string;
  waste_reduction_percentage: number;
  top_cost_saving_opportunities: Array<{
    item: string;
    potential_savings: string;
    recommendation: string;
  }>;
  inventory_turnover_insights: {
    fast_moving: string[];
    slow_moving: string[];
    optimal_stock_levels: Record<string, number>;
  };
  demand_patterns: Record<string, any>;
  seasonal_trends: Record<string, any>;
}

export interface DemandForecast {
  item_name: string;
  forecasts: Array<{
    date: string;
    predicted_demand: number;
    confidence_level: number;
    factors: string[];
  }>;
  recommendations: {
    optimal_stock_level: number;
    reorder_point: number;
    suggested_order_quantity: number;
  };
}

export interface SmartAlert {
  id: string;
  type: 'low_stock' | 'expiring_soon' | 'optimization' | 'anomaly';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  item_name?: string;
  suggested_action: string;
  created_at: string;
  resolved: boolean;
}

export interface VoiceCommand {
  id: string;
  transcript: string;
  confidence: number;
  action: string;
  parameters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  type: string;
  rating: number;
  contact_info: {
    email: string;
    phone: string;
    address: string;
  };
  specialties: string[];
  lead_time_days: number;
  minimum_order: number;
  delivery_areas: string[];
}

export interface AutoOrderResult {
  success: boolean;
  orders_created: number;
  total_estimated_cost: number;
  orders: Array<{
    supplier: string;
    items: Array<{
      ingredient: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    estimated_delivery: string;
  }>;
  optimization_notes: string[];
}

export interface OptimizationReport {
  overall_score: number;
  cost_analysis: {
    potential_savings: string;
    waste_reduction: string;
    efficiency_improvements: string[];
  };
  inventory_health: {
    overstock_items: string[];
    understock_items: string[];
    optimal_items: string[];
  };
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    expected_impact: string;
  }>;
  market_insights: {
    price_trends: Record<string, string>;
    seasonal_factors: Record<string, string>;
  };
}

/**
 * Advanced Inventory API - Integrates with AI-powered backend endpoints
 */
export class AdvancedInventoryAPI {
  private client: MenurithmAPIClient;

  constructor(client: MenurithmAPIClient = apiClient) {
    this.client = client;
  }

  /**
   * Get AI-powered inventory analytics
   */
  async getAnalytics(): Promise<AIAnalytics> {
    return this.client.authRequest<AIAnalytics>('/api/advanced-inventory/analytics');
  }

  /**
   * Get demand forecast for specific item
   */
  async getDemandForecast(itemName: string, daysAhead: number = 7): Promise<DemandForecast> {
    return this.client.authRequest<DemandForecast>(
      `/api/advanced-inventory/demand-forecast/${encodeURIComponent(itemName)}?days_ahead=${daysAhead}`
    );
  }

  /**
   * Start voice update session
   */
  async startVoiceUpdate(): Promise<{ session_id: string; message: string }> {
    return this.client.authRequest('/api/advanced-inventory/voice-update', {
      method: 'POST',
    });
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(audioData: Blob): Promise<VoiceCommand> {
    const formData = new FormData();
    formData.append('audio', audioData);

    const response = await fetch(`${this.client['baseURL']}/voice-commands/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Voice processing failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get voice command history
   */
  async getVoiceCommands(limit: number = 20): Promise<{ commands: VoiceCommand[] }> {
    return this.client.authRequest(`/api/advanced-inventory/voice-commands?limit=${limit}`);
  }

  /**
   * Get supplier information
   */
  async getSuppliers(): Promise<{ suppliers: Supplier[] }> {
    return this.client.authRequest('/api/advanced-inventory/suppliers');
  }

  /**
   * Search suppliers for specific ingredient
   */
  async searchSuppliers(ingredient: string): Promise<{ suppliers: Supplier[] }> {
    return this.client.authRequest(`/suppliers/search/${encodeURIComponent(ingredient)}`);
  }

  /**
   * Create automatic orders based on AI recommendations
   */
  async createAutoOrder(): Promise<AutoOrderResult> {
    return this.client.authRequest('/api/advanced-inventory/auto-order', {
      method: 'POST',
    });
  }

  /**
   * Get comprehensive optimization report
   */
  async getOptimizationReport(): Promise<OptimizationReport> {
    return this.client.authRequest('/api/advanced-inventory/optimization-report');
  }

  /**
   * Get smart alerts
   */
  async getAlerts(priority?: 'low' | 'medium' | 'high' | 'critical'): Promise<{ alerts: SmartAlert[] }> {
    const url = priority 
      ? `/api/advanced-inventory/alerts?priority=${priority}`
      : '/api/advanced-inventory/alerts';
    return this.client.authRequest(url);
  }

  /**
   * Run inventory optimization
   */
  async runOptimization(): Promise<{ 
    message: string; 
    optimization_id: string; 
    estimated_completion: string; 
  }> {
    return this.client.authRequest('/api/advanced-inventory/optimize', {
      method: 'POST',
    });
  }

  /**
   * Sync supplier catalog
   */
  async syncSupplierCatalog(supplierId: string): Promise<{ 
    success: boolean; 
    items_synced: number; 
    message: string; 
  }> {
    return this.client.authRequest('/suppliers/sync-catalog', {
      method: 'POST',
      body: JSON.stringify({ supplier_id: supplierId }),
    });
  }

  /**
   * Get orders list
   */
  async getOrders(): Promise<{ orders: any[] }> {
    return this.client.authRequest('/orders');
  }

  /**
   * Create supplier order
   */
  async createOrder(orderData: any): Promise<any> {
    return this.client.authRequest('/orders/create', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  /**
   * Confirm order delivery
   */
  async confirmDelivery(orderId: string, deliveryData: any): Promise<any> {
    return this.client.authRequest(`/orders/${orderId}/confirm-delivery`, {
      method: 'POST',
      body: JSON.stringify(deliveryData),
    });
  }

  // Helper method to get auth token
  private async getAuthToken(): Promise<string> {
    // This would integrate with your existing auth system
    // For now, return empty string as authFetch handles authentication
    return '';
  }
}

// Singleton instance
export const advancedInventoryAPI = new AdvancedInventoryAPI();
