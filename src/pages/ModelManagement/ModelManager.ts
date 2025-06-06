import { CreateMLCEngine, CreateServiceWorkerMLCEngine, ModelRecord, prebuiltAppConfig } from '@mlc-ai/web-llm';
import browser from 'webextension-polyfill';
import { StorageKey } from '../../constants';

export interface ModelInfo {
  name: string;
  displayName: string;
}

export const DEFAULT_SYSTEM_PROMPT = `You are an expert news summarization assistant. Your job is to produce highly concise, factual summaries that only include the most essential information directly stated in the input article.
Do not add, infer, or restate any information that is not explicitly mentioned in the text.
Summaries should be clear, objective, and free from any opinions, background context, or details not central to the main news event.
Keep your summary as brief as possible, ideally in 2 or 3 sentences.`;

export const modelList: ModelInfo[] = [
  {
    name: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    displayName: "Llama 3.2 3B Instruct"
  },
  {
    name: "SmolLM2-360M-Instruct-q0f16-MLC",
    displayName: "SmolLM2 360M Instruct"
  },
  {
    name: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    displayName: "Phi 3.5 mini instruct"
  },
  {
    name: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC",
    displayName: "Qwen 2.5 3B  Instruct"
  }
];

export const getAvailableModels = async (): Promise<string[]> => {
  try {
    const result = await browser.storage.local.get(StorageKey.DOWNLOADED_MODELS);
    if (result[StorageKey.DOWNLOADED_MODELS]) {
      const models: ModelInfo[] = result[StorageKey.DOWNLOADED_MODELS];
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
    const result = await browser.storage.local.get(StorageKey.DOWNLOADED_MODELS);
    if (result[StorageKey.DOWNLOADED_MODELS]) {
      const models: ModelInfo[] = result[StorageKey.DOWNLOADED_MODELS];
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
      const result = await browser.storage.local.get(StorageKey.DOWNLOADED_MODELS);
      if (result[StorageKey.DOWNLOADED_MODELS]) {
        this.downloadedModels = result[StorageKey.DOWNLOADED_MODELS];
      }
    } catch (error) {
      console.error('Error loading downloaded models:', error);
    }
  }

  static getCurrentEngine(): { engine: any; modelId: string } | null {
    return this.currentEngine;
  }

  static async getSystemPrompt() {
    return DEFAULT_SYSTEM_PROMPT;
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
      const result = await browser.storage.local.get(StorageKey.DOWNLOADED_MODELS);
      const downloadedModels = result[StorageKey.DOWNLOADED_MODELS];
      return downloadedModels?.map((model: ModelInfo) => model.name) ?? [];
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }

  static async getModelInfo(modelId: string): Promise<ModelInfo | undefined> {
    try {
      const result = await browser.storage.local.get(StorageKey.DOWNLOADED_MODELS);
      if (result[StorageKey.DOWNLOADED_MODELS]) {
        const models: ModelInfo[] = result[StorageKey.DOWNLOADED_MODELS];
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

      const result = await browser.storage.local.get(StorageKey.DOWNLOADED_MODELS);
      let models: ModelInfo[] = result[StorageKey.DOWNLOADED_MODELS] || [];
      
      if (!models.some(m => m.name === modelId)) {
        models.push(modelInfo);
        await browser.storage.local.set({ [StorageKey.DOWNLOADED_MODELS]: models });
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
}

export default ModelManager; 