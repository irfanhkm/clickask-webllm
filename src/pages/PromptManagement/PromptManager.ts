import browser from 'webextension-polyfill';

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
}

export class PromptManager {
  private static STORAGE_KEY = 'promptTemplates';

  static async getPromptTemplates(): Promise<PromptTemplate[]> {
    try {
      const result = await browser.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || [];
    } catch (error) {
      console.error('Error getting prompt templates:', error);
      return [];
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
      await browser.storage.local.set({ [this.STORAGE_KEY]: filteredTemplates });
    } catch (error) {
      console.error('Error deleting prompt template:', error);
      throw error;
    }
  }
}

export default PromptManager; 