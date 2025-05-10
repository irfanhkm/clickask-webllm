// Browser action constants
export enum BrowserAction {
  OPEN_SIDE_PANEL = 'openSidePanel',
  OPEN_SIDE_PANEL_FROM_BUTTON = 'openSidePanelFromButton',
  INSERT_PROMPT = 'insertPrompt'
}

// Other constants
export const BROWSER_CONTEXT_PROMPT_ID = 'prompt-template-';

// Storage types
export enum StorageType {
  LOCAL = 'local',
  SESSION = 'session',
  SYNC = 'sync'
}

// Browser storage keys (browser.storage.local)
export enum BrowserStorageKey {
  // Chat related
  CHATS = 'chats',
  CURRENT_CHAT_ID = 'currentChatId',
  
  // Model related
  DOWNLOADED_MODELS = 'downloadedModels',
  DEFAULT_MODEL = 'defaultModel',
  DOWNLOAD_STATES = 'downloadStates',
  
  // Prompt related
  PROMPT_TEMPLATES = 'promptTemplates'
}

// Local storage keys (localStorage)
export enum LocalStorageKey {
  GLOBAL_SYSTEM_PROMPT = 'globalSystemPrompt',
  DOWNLOADED_MODELS = 'downloadedModels',
  DEFAULT_MODEL = 'defaultModel',
  DOWNLOAD_STATES = 'downloadStates'
}

// IndexedDB keys
export enum IndexedDBKey {
  DB_NAME = 'chatStorage',
  STORE_NAME = 'chatRooms'
}

// For backward compatibility
export enum StorageKey {
  // Chat related
  CHATS = BrowserStorageKey.CHATS,
  CURRENT_CHAT_ID = BrowserStorageKey.CURRENT_CHAT_ID,
  
  // Model related
  DOWNLOADED_MODELS = BrowserStorageKey.DOWNLOADED_MODELS,
  DEFAULT_MODEL = BrowserStorageKey.DEFAULT_MODEL,
  DOWNLOAD_STATES = BrowserStorageKey.DOWNLOAD_STATES,
  
  // Prompt related
  PROMPT_TEMPLATES = BrowserStorageKey.PROMPT_TEMPLATES,
  GLOBAL_SYSTEM_PROMPT = LocalStorageKey.GLOBAL_SYSTEM_PROMPT
}