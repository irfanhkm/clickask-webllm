import browser from 'webextension-polyfill';
import { defaultTemplates } from './DefaultTemplates';
import { StorageKey } from '../../constants';

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
}

export class PromptManager {
  private static STORAGE_KEY = StorageKey.PROMPT_TEMPLATES;
  private static EMPTY_IDENTIFIER = '-';

  static async getPromptTemplates(): Promise<PromptTemplate[]> {
    try {
      const result = await browser.storage.local.get(this.STORAGE_KEY);
      const storedTemplates = result[this.STORAGE_KEY];

      if (storedTemplates === this.EMPTY_IDENTIFIER) {
        return [];
      }
      
      // If templates have never been initialized, are empty
      if (storedTemplates === undefined) {
        await this.initializeDefaultTemplates();
        return defaultTemplates;
      }
      
      return storedTemplates;
    } catch (error) {
      console.error('Error getting prompt templates:', error);
      return [];
    }
  }

  private static async initializeDefaultTemplates(): Promise<void> {
    try {
      await browser.storage.local.set({ [this.STORAGE_KEY]: defaultTemplates });
    } catch (error) {
      console.error('Error initializing default templates:', error);
    }
  }

  static async savePromptTemplate(template: PromptTemplate): Promise<void> {
    try {
      const templates = await this.getPromptTemplates();
      const existingIndex = templates.findIndex(t => t.id === template.id);
      
      if (existingIndex >= 0) {
        templates[existingIndex] = template;
      } else {
        templates.push(template);
      }
      
      await browser.storage.local.set({ [this.STORAGE_KEY]: templates });
    } catch (error) {
      console.error('Error saving prompt template:', error);
      throw error;
    }
  }

  static async deletePromptTemplate(id: string): Promise<void> {
    try {
      const templates = await this.getPromptTemplates();
      const filteredTemplates = templates.filter(t => t.id !== id);
      if (filteredTemplates.length === 0) {
        await browser.storage.local.set({ [this.STORAGE_KEY]: this.EMPTY_IDENTIFIER });
      } else {
        await browser.storage.local.set({ [this.STORAGE_KEY]: filteredTemplates });
      }      
      
    } catch (error) {
      console.error('Error deleting prompt template:', error);
      throw error;
    }
  }
}

export default PromptManager; 