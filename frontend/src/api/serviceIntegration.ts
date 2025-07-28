import { apiClient, MenurithmAPIClient } from './client';

export interface ServiceDish {
  name: string;
  description: string;
  price: number;
  category: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  preparation_time?: number;
  dietary_info?: {
    vegetarian?: boolean;
    vegan?: boolean;
    gluten_free?: boolean;
    allergens?: string[];
  };
  nutritional_info?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface ServiceDishResponse {
  success: boolean;
  dish_id: string;
  message: string;
  dish: ServiceDish;
}

export interface BatchDishData {
  dishes: ServiceDish[];
  options?: {
    skip_duplicates?: boolean;
    update_existing?: boolean;
    validate_ingredients?: boolean;
  };
}

export interface BatchDishResponse {
  success: boolean;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  results: Array<{
    dish_name: string;
    status: 'created' | 'updated' | 'skipped' | 'failed';
    dish_id?: string;
    error?: string;
  }>;
  message: string;
}

export interface ServiceConnectionTest {
  connected: boolean;
  api_version: string;
  service_name: string;
  timestamp: string;
  features_available: string[];
}

/**
 * Service Integration API - Handles service-to-service communications
 */
export class ServiceIntegrationAPI {
  private client: MenurithmAPIClient;

  constructor(client: MenurithmAPIClient = apiClient) {
    this.client = client;
  }

  /**
   * Test service connection using API key authentication
   */
  async testConnection(): Promise<ServiceConnectionTest> {
    return this.client.serviceRequest<ServiceConnectionTest>('/auth/flexible-auth');
  }

  /**
   * Create a single dish via service-to-service call
   */
  async createDishService(dishData: ServiceDish): Promise<ServiceDishResponse> {
    return this.client.serviceRequest<ServiceDishResponse>('/service/dishes', {
      method: 'POST',
      body: JSON.stringify(dishData),
    });
  }

  /**
   * Create multiple dishes in batch via service-to-service call
   */
  async createDishesBatch(batchData: BatchDishData): Promise<BatchDishResponse> {
    return this.client.serviceRequest<BatchDishResponse>('/service/dishes/batch', {
      method: 'POST',
      body: JSON.stringify(batchData),
    });
  }

  /**
   * Validate dish data before creation
   */
  validateDishData(dish: Partial<ServiceDish>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dish.name || dish.name.trim() === '') {
      errors.push('Dish name is required');
    }

    if (!dish.description || dish.description.trim() === '') {
      errors.push('Dish description is required');
    }

    if (!dish.price || dish.price <= 0) {
      errors.push('Valid price is required');
    }

    if (!dish.category || dish.category.trim() === '') {
      errors.push('Dish category is required');
    }

    if (!dish.ingredients || dish.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    } else {
      dish.ingredients.forEach((ingredient, index) => {
        if (!ingredient.name || ingredient.name.trim() === '') {
          errors.push(`Ingredient ${index + 1} name is required`);
        }
        if (!ingredient.quantity || ingredient.quantity <= 0) {
          errors.push(`Ingredient ${index + 1} quantity must be greater than 0`);
        }
        if (!ingredient.unit || ingredient.unit.trim() === '') {
          errors.push(`Ingredient ${index + 1} unit is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a dish template for service integration
   */
  createDishTemplate(): ServiceDish {
    return {
      name: '',
      description: '',
      price: 0,
      category: '',
      ingredients: [
        {
          name: '',
          quantity: 0,
          unit: '',
        },
      ],
      preparation_time: 0,
      dietary_info: {
        vegetarian: false,
        vegan: false,
        gluten_free: false,
        allergens: [],
      },
      nutritional_info: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    };
  }

  /**
   * Convert regular dish data to service dish format
   */
  convertToServiceDish(regularDish: any): ServiceDish {
    return {
      name: regularDish.name || '',
      description: regularDish.description || '',
      price: Number(regularDish.price) || 0,
      category: regularDish.category || '',
      ingredients: regularDish.ingredients || [],
      preparation_time: regularDish.preparation_time,
      dietary_info: regularDish.dietary_info,
      nutritional_info: regularDish.nutritional_info,
    };
  }

  /**
   * Bulk import dishes from CSV-like data
   */
  async bulkImportDishes(
    dishesData: any[], 
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      validateIngredients?: boolean;
    } = {}
  ): Promise<BatchDishResponse> {
    const serviceDishes = dishesData.map(dish => this.convertToServiceDish(dish));
    
    const batchData: BatchDishData = {
      dishes: serviceDishes,
      options: {
        skip_duplicates: options.skipDuplicates ?? true,
        update_existing: options.updateExisting ?? false,
        validate_ingredients: options.validateIngredients ?? true,
      },
    };

    return this.createDishesBatch(batchData);
  }

  /**
   * Get service API capabilities
   */
  async getServiceCapabilities(): Promise<{
    endpoints: string[];
    authentication: string[];
    features: string[];
  }> {
    // This would be a real endpoint in a full implementation
    return {
      endpoints: [
        '/service/dishes',
        '/service/dishes/batch',
        '/auth/flexible-auth'
      ],
      authentication: ['API Key', 'Firebase JWT'],
      features: [
        'Single dish creation',
        'Batch dish creation',
        'Data validation',
        'Duplicate handling',
        'Ingredient validation'
      ],
    };
  }
}

// Singleton instance
export const serviceIntegrationAPI = new ServiceIntegrationAPI();
