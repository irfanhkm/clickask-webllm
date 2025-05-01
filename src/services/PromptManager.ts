export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export class PromptManager {
  static async getPromptTemplates(): Promise<PromptTemplate[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get('promptTemplates');
        return result.promptTemplates || [];
      } else {
        const savedTemplates = localStorage.getItem('promptTemplates');
        return savedTemplates ? JSON.parse(savedTemplates) : [];
      }
    } catch (error) {
      console.error('Error getting prompt templates:', error);
      return [];
    }
  }

  static async addPromptTemplate(title: string, content: string): Promise<PromptTemplate> {
    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      createdAt: Date.now()
    };

    const templates = await this.getPromptTemplates();
    const updatedTemplates = [...templates, newTemplate];

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ promptTemplates: updatedTemplates });
      } else {
        localStorage.setItem('promptTemplates', JSON.stringify(updatedTemplates));
      }
    } catch (error) {
      console.error('Error saving prompt template:', error);
    }

    return newTemplate;
  }

  static async deletePromptTemplate(id: string): Promise<void> {
    const templates = await this.getPromptTemplates();
    const updatedTemplates = templates.filter(template => template.id !== id);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ promptTemplates: updatedTemplates });
      } else {
        localStorage.setItem('promptTemplates', JSON.stringify(updatedTemplates));
      }
    } catch (error) {
      console.error('Error deleting prompt template:', error);
    }
  }
} 