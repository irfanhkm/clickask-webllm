import { CreateMLCEngine, ModelRecord, prebuiltAppConfig } from '@mlc-ai/web-llm';

export interface ModelInfo {
  name: string;
  displayName: string;
}

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

export const getAvailableModels = (): string[] => {
  // Get downloaded models from localStorage
  const downloadedModels = localStorage.getItem('downloadedModels');
  if (downloadedModels) {
    const models: ModelInfo[] = JSON.parse(downloadedModels);
    return models.map(model => model.name);
  }
  return [];
};

export const getModelInfo = (modelId: string): ModelInfo | undefined => {
  // First check downloaded models
  const downloadedModels = localStorage.getItem('downloadedModels');
  if (downloadedModels) {
    const models: ModelInfo[] = JSON.parse(downloadedModels);
    const downloadedModel = models.find(m => m.name === modelId);
    if (downloadedModel) return downloadedModel;
  }
  
  // If not found in downloaded models, check the full list
  return modelList.find(model => model.name === modelId);
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
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get('downloadedModels');
      this.downloadedModels = result.downloadedModels || [];
    } else {
      const models = localStorage.getItem('downloadedModels');
      this.downloadedModels = models ? JSON.parse(models) : [];
    }
  }

  static getCurrentEngine(): { engine: any; modelId: string } | null {
    return this.currentEngine;
  }

  static async initializeEngine(modelId: string): Promise<any> {
    try {
      // If we already have an engine for this model, return it
      if (this.currentEngine?.modelId === modelId) {
        return this.currentEngine.engine;
      }

      // If we have a different engine, we need to create a new one
      // Just set currentEngine to null to allow garbage collection
      this.currentEngine = null;

      // Create new engine
      const engine = await CreateMLCEngine(modelId);
      
      // Update current engine
      this.currentEngine = {
        engine,
        modelId
      };

      return engine;
    } catch (error) {
      console.error('Error initializing engine:', error);
      this.currentEngine = null;
      throw error;
    }
  }

  static async getAvailableModels(): Promise<string[]> {
    try {
      // First check if we have downloaded models in storage
      let downloadedModels: ModelInfo[] = [];
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get('downloadedModels');
        downloadedModels = result.downloadedModels || [];
      } else {
        const models = localStorage.getItem('downloadedModels');
        downloadedModels = models ? JSON.parse(models) : [];
      }

      // If we have downloaded models, return their names
      if (downloadedModels.length > 0) {
        return downloadedModels.map(model => model.name);
      }

      // Otherwise, return the initial model list from prebuiltAppConfig
      return prebuiltAppConfig.model_list.map(model => model.model_id);
    } catch (error) {
      console.error('Error getting available models:', error);
      return prebuiltAppConfig.model_list.map(model => model.model_id);
    }
  }

  static async getModelInfo(modelId: string): Promise<ModelInfo | undefined> {
    // First check if it's in the downloaded models
    let downloadedModels: ModelInfo[] = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get('downloadedModels');
      downloadedModels = result.downloadedModels || [];
    } else {
      const models = localStorage.getItem('downloadedModels');
      downloadedModels = models ? JSON.parse(models) : [];
    }

    return downloadedModels.find(m => m.name === modelId);
  }

  static async addDownloadedModel(modelId: string): Promise<void> {
    const modelRecord = prebuiltAppConfig.model_list.find(m => m.model_id === modelId);
    if (!modelRecord) {
      throw new Error(`Model ${modelId} not found in prebuiltAppConfig`);
    }

    const modelInfo: ModelInfo = {
      name: modelRecord.model_id,
      displayName: modelRecord.model_lib
    };

    let downloadedModels: ModelInfo[] = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get('downloadedModels');
      downloadedModels = result.downloadedModels || [];
      downloadedModels.push(modelInfo);
      await chrome.storage.local.set({ downloadedModels });
    } else {
      const models = localStorage.getItem('downloadedModels');
      downloadedModels = models ? JSON.parse(models) : [];
      downloadedModels.push(modelInfo);
      localStorage.setItem('downloadedModels', JSON.stringify(downloadedModels));
    }
  }

  public async downloadModel(model: ModelRecord): Promise<void> {
    // Check if model is already downloaded
    if (this.downloadedModels.some(m => m.name === model.model_id)) {
      console.log('Model already downloaded, using cached version');
      return;
    }

    try {
      // Initialize engine to trigger download
      await CreateMLCEngine(model.model_id, {
        initProgressCallback: (report: { progress: number }) => {
          console.log('Model download progress:', report.progress);
        }
      });

      // Add to downloaded models list
      const modelInfo: ModelInfo = {
        name: model.model_id,
        displayName: model.model_lib
      };

      this.downloadedModels.push(modelInfo);

      // Save to storage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ downloadedModels: this.downloadedModels });
      } else {
        localStorage.setItem('downloadedModels', JSON.stringify(this.downloadedModels));
      }
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
}

export default ModelManager; 