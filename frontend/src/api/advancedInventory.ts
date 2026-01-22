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

export interface VoiceCommandSuggestion {
  pattern: string;
  description: string;
  example: string;
}

export interface VoiceProcessingResult {
  success: boolean;
  message: string;
  result?: {
    action: string;
    parameters: Record<string, any>;
    confidence: number;
  };
  status: 'completed' | 'failed' | 'unavailable';
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
   * Check voice recognition system status
   */
   async getVoiceStatus(): Promise<{
    success: boolean;
    voice_available: boolean;
    speech_recognition_module: boolean;
    message: string;
    instructions?: {
      usage: string;
      supported_formats: string[];
      max_duration: string;
    };
  }> {
    return this.client.authRequest('/api/advanced-inventory/voice-status');
  }

  /**
   * Start live voice recording using browser microphone
   */
  async startLiveVoiceRecording(): Promise<{
    mediaRecorder: MediaRecorder;
    stop: () => Promise<any>;
  }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      
      const audioChunks: Blob[] = [];
      
      // Try to use WAV format if supported, fallback to WebM
      let mimeType = 'audio/wav';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });
      
      const stopRecording = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          mediaRecorder.addEventListener('stop', async () => {
            try {
              // Stop all tracks to release microphone
              stream.getTracks().forEach(track => track.stop());
              
              // Create audio file from recorded chunks
              const audioBlob = new Blob(audioChunks, { type: mimeType });
              
              // Convert to WAV format if needed
              let finalAudioFile: File;
              if (mimeType === 'audio/wav') {
                finalAudioFile = new File([audioBlob], 'voice-command.wav', {
                  type: 'audio/wav'
                });
              } else {
                // Convert WebM to WAV using Web Audio API
                try {
                  const wavFile = await this.convertToWav(audioBlob);
                  finalAudioFile = new File([wavFile], 'voice-command.wav', {
                    type: 'audio/wav'
                  });
                } catch (conversionError) {
                  console.warn('WAV conversion failed, using original format:', conversionError);
                  finalAudioFile = new File([audioBlob], 'voice-command.webm', {
                    type: mimeType
                  });
                }
              }
              
              // Process the recorded audio
              const result = await this.processVoiceCommand(finalAudioFile);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
          
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        });
      };
      
      // Start recording
      mediaRecorder.start();
      
      return {
        mediaRecorder,
        stop: stopRecording
      };
      
    } catch (error) {
      throw new Error(`Microphone access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert audio blob to WAV format using Web Audio API
   */
  private async convertToWav(audioBlob: Blob | File): Promise<Blob> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV format
      const wavBuffer = this.audioBufferToWav(audioBuffer);
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } finally {
      await audioContext.close();
    }
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    
    // FMT sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Sub-chunk size
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true); // Byte rate
    view.setUint16(32, numberOfChannels * 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    
    // Data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }

  /**
   * Check microphone permissions and availability
   */
  async checkMicrophonePermissions(): Promise<{
    available: boolean;
    permission: PermissionState;
    message: string;
  }> {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          available: false,
          permission: 'denied' as PermissionState,
          message: 'Microphone access not supported in this browser'
        };
      }
      
      // Check microphone permission
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      return {
        available: permission.state !== 'denied',
        permission: permission.state,
        message: permission.state === 'granted' 
          ? 'Microphone access granted' 
          : permission.state === 'prompt'
          ? 'Microphone access will be requested'
          : 'Microphone access denied'
      };
    } catch (error) {
      return {
        available: false,
        permission: 'denied' as PermissionState,
        message: 'Unable to check microphone permissions'
      };
    }
  }

  /**
   * Process voice command from audio file
   */
  async processVoiceCommand(audioFile: File): Promise<{
    success: boolean;
    message: string;
    result?: any;
    status: string;
  }> {
    // Validate audio file format
    const supportedFormats = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/aiff', 'audio/flac'];
    
    if (!supportedFormats.includes(audioFile.type) && !audioFile.name.match(/\.(wav|aiff|flac)$/i)) {
      // Try to convert unsupported formats to WAV
      if (audioFile.type.includes('webm') || audioFile.type.includes('mp3') || audioFile.type.includes('ogg')) {
        try {
          console.log(`Converting ${audioFile.type} to WAV format...`);
          const wavBlob = await this.convertToWav(audioFile);
          audioFile = new File([wavBlob], audioFile.name.replace(/\.[^.]+$/, '.wav'), {
            type: 'audio/wav'
          });
        } catch (conversionError) {
          console.error('Audio conversion failed:', conversionError);
          throw new Error(`Unsupported audio format: ${audioFile.type}. Please use WAV, AIFF, or FLAC format.`);
        }
      } else {
        throw new Error(`Unsupported audio format: ${audioFile.type}. Please use WAV, AIFF, or FLAC format.`);
      }
    }

    const formData = new FormData();
    formData.append('audio_file', audioFile);

    // Use authFetch for proper authentication
    const { authFetch } = await import('../hooks/authFetch');
    const response = await authFetch(`${this.client['baseURL']}/api/advanced-inventory/voice-update`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it for multipart/form-data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Voice processing failed: ${errorData.detail || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get voice command examples and suggestions
   */
  async getVoiceCommands(limit: number = 20): Promise<{
    success: boolean;
    commands: string[];
    total_available: number;
    examples: string[];
  }> {
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

  /**
   * Get available produce from RouteCast
   */
  async getAvailableProduce(): Promise<{ produce: any[] }> {
    return this.client.authRequest('/api/advanced-inventory/available-produce');
  }

  /**
   * Create a produce order through RouteCast
   */
  async createProduceOrder(orderData: {
    restaurant_name: string;
    produce_type: string;
    quantity_needed: number;
    unit: string;
    delivery_address: string;
    delivery_window_start: string;
    delivery_window_end: string;
    max_price_per_unit?: number;
    special_requirements?: string;
    organic_preferred?: boolean;
  }): Promise<{
    success: boolean;
    request_id: number;
    status: string;
    message: string;
    demo_mode?: boolean;
    order_details?: {
      restaurant_name: string;
      produce_type: string;
      quantity_needed: number;
      unit: string;
      delivery_address: string;
      delivery_window_start: string;
      delivery_window_end: string;
    };
  }> {
    return this.client.authRequest('/api/advanced-inventory/create-produce-order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  /**
   * Get status of a produce request from RouteCast
   */
  async getProduceRequestStatus(requestId: number): Promise<{
    success: boolean;
    request_id: number;
    status: string;
    demo_mode?: boolean;
    message?: string;
  }> {
    return this.client.authRequest(`/api/advanced-inventory/produce-request/${requestId}`);
  }

}

// Singleton instance
export const advancedInventoryAPI = new AdvancedInventoryAPI();
