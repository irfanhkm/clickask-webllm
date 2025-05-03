import { CreateMLCEngine, ModelRecord, prebuiltAppConfig } from '@mlc-ai/web-llm';
import browser from 'webextension-polyfill';

export interface ModelInfo {
  name: string;
  displayName: string;
}

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant. Your responses should:
1. Use markdown formatting for better readability
2. Format code blocks with proper language tags
3. Use lists and headers for organization
4. Use bold/italic for emphasis
5. NEVER repeat or rephrase the user's question
6. Provide direct answers without any preamble
7. Be concise and to the point
8. Focus on the specific information requested
9. If you don't know something, simply say "I don't know"`;

export const modelList: ModelInfo[] = [
  {
    name: "SmolLM2-360M-Instruct-q0f16-MLC",
    displayName: "SmolLM2 360M Instruct"
  },
  {
    name: "SmolLM2-1.7B-Instruct-q4f32_1-MLC",
    displayName: "SmolLM2 1.7B Instruct"
  }
];

export const getAvailableModels = async (): Promise<string[]> => {
  try {
    const result = await browser.storage.local.get('downloadedModels');
    if (result.downloadedModels) {
      const models: ModelInfo[] = result.downloadedModels;
      return models.map(model => model.name);
    }
    return [];
  } catch (error) {
    console.error('Error getting available models:', error);
    return [];
  }
};

export const getModelInfo = async (modelId: string): Promise<ModelInfo | undefined> => {
  try {
    const result = await browser.storage.local.get('downloadedModels');
    if (result.downloadedModels) {
      const models: ModelInfo[] = result.downloadedModels;
      const downloadedModel = models.find(m => m.name === modelId);
      if (downloadedModel) return downloadedModel;
    }
    
    return modelList.find(model => model.name === modelId);
  } catch (error) {
    console.error('Error getting model info:', error);
    return undefined;
  }
};

export class ModelManager {
  private static instance: ModelManager;
  private downloadedModels: ModelInfo[] = [];
  private static currentEngine: { engine: any; modelId: string } | null = null;

  private constructor() {
    this.loadDownloadedModels();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  private async loadDownloadedModels() {
    try {
      const result = await browser.storage.local.get('downloadedModels');
      if (result.downloadedModels) {
        this.downloadedModels = result.downloadedModels;
      }
    } catch (error) {
      console.error('Error loading downloaded models:', error);
    }
  }

  static getCurrentEngine(): { engine: any; modelId: string } | null {
    return this.currentEngine;
  }

  static getSystemPrompt(): string {
    return localStorage.getItem('globalSystemPrompt') || DEFAULT_SYSTEM_PROMPT;
  }

  static async initializeEngine(modelId: string): Promise<any> {
    try {
      const modelInfo = await this.getModelInfo(modelId);
      if (!modelInfo) {
        throw new Error(`Model ${modelId} not found`);
      }

      const engine = await CreateMLCEngine(modelId);
      this.currentEngine = { engine, modelId };
      return engine;
    } catch (error) {
      console.error('Error initializing engine:', error);
      throw error;
    }
  }

  static async getAvailableModels(): Promise<string[]> {
    try {
      const downloadedModels = JSON.parse(localStorage.getItem('downloadedModels') || '[]');
      return downloadedModels.map((model: ModelInfo) => model.name);
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }

  static async getModelInfo(modelId: string): Promise<ModelInfo | undefined> {
    try {
      const result = await browser.storage.local.get('downloadedModels');
      if (result.downloadedModels) {
        const models: ModelInfo[] = result.downloadedModels;
        const downloadedModel = models.find(m => m.name === modelId);
        if (downloadedModel) return downloadedModel;
      }
      
      return modelList.find(model => model.name === modelId);
    } catch (error) {
      console.error('Error getting model info:', error);
      return undefined;
    }
  }

  static async addDownloadedModel(modelId: string): Promise<void> {
    try {
      const modelInfo = modelList.find(m => m.name === modelId);
      if (!modelInfo) return;

      const result = await browser.storage.local.get('downloadedModels');
      let models: ModelInfo[] = result.downloadedModels || [];
      
      if (!models.some(m => m.name === modelId)) {
        models.push(modelInfo);
        await browser.storage.local.set({ downloadedModels: models });
      }
    } catch (error) {
      console.error('Error adding downloaded model:', error);
    }
  }

  public async downloadModel(model: ModelRecord): Promise<void> {
    try {
      await ModelManager.addDownloadedModel(model.model_id);
      await this.loadDownloadedModels();
    } catch (error) {
      console.error('Error downloading model:', error);
      throw error;
    }
  }

  public getDownloadedModels(): ModelInfo[] {
    return this.downloadedModels;
  }

  public isModelDownloaded(modelId: string): boolean {
    return this.downloadedModels.some(m => m.name === modelId);
  }

  static async backupModelFiles(modelId: string): Promise<Blob> {
    try {
      // Get the cache storage
      const cache = await caches.open('webllm');
      
      // Get all cached files for this model
      const keys = await cache.keys();
      const modelFiles = keys.filter(request => 
        request.url.includes(modelId)
      );
      
      // Create backup data
      const backupData = {
        files: await Promise.all(modelFiles.map(async request => {
          const response = await cache.match(request);
          if (!response) return null;
          
          const data = new Uint8Array(await response.arrayBuffer());
          return {
            url: request.url,
            data: Array.from(data)
          };
        }))
      };
      
      return new Blob([JSON.stringify(backupData)], { type: 'application/json' });
    } catch (error) {
      console.error('Error backing up model files:', error);
      throw error;
    }
  }

  static async restoreModelFiles(modelId: string, backupBlob: Blob): Promise<void> {
    try {
      // Parse the backup data
      const backupData = JSON.parse(await backupBlob.text());
      
      if (!backupData.files || !Array.isArray(backupData.files)) {
        throw new Error('Invalid backup format');
      }

      // Get the cache storage
      const cache = await caches.open('webllm');
      
      // Restore each file
      await Promise.all(backupData.files.map(async (file: { url: string; data: number[] }) => {
        const response = new Response(new Uint8Array(file.data));
        await cache.put(file.url, response);
      }));
      
      // Update the downloaded models list
      await this.addDownloadedModel(modelId);
    } catch (error) {
      console.error('Error restoring model files:', error);
      throw error;
    }
  }
}

export default ModelManager; 