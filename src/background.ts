import browser from "webextension-polyfill";
import { PromptManager, PromptTemplate } from "./pages/PromptManagement/PromptManager";
import { BROWSER_CONTEXT_PROMPT_ID, BrowserAction, StorageKey } from "./constants";
import ModelManager from "./pages/ModelManagement/ModelManager";
import { ChatManager } from "./pages/ChatManagement/ChatManager";

// Handle Chrome side panel
if (chrome?.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(error => console.error(error));
}

// Handle Firefox sidebar
if (browser?.sidebarAction) {
  browser.sidebarAction.setPanel({ panel: "src/PanelRoute.html" });
}

// Create context menu for prompt templates
async function createPromptContextMenu() {
  try {
    // Remove existing context menu items to avoid duplicates
    await browser.contextMenus.removeAll();
    
    // Create parent menu item
    browser.contextMenus.create({
      id: "prompt-templates",
      title: "ClickAsk Prompts",
      contexts: ["all"]
    });
    
    // Get all prompt templates
    const templates = await PromptManager.getPromptTemplates();
    
    // Add each template as a submenu item
    templates.forEach((template: PromptTemplate) => {
      browser.contextMenus.create({
        id: `${BROWSER_CONTEXT_PROMPT_ID}${template.id}`,
        parentId: "prompt-templates",
        title: template.title,
        contexts: ["all"]
      });
    });
  } catch (error) {
    console.error("Error creating context menu:", error);
  }
}

// Initialize context menu when extension is installed or updated
browser.runtime.onInstalled.addListener(() => {
  createPromptContextMenu();
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  // Check if the clicked item is a prompt template
  if (info.menuItemId.toString().startsWith(BROWSER_CONTEXT_PROMPT_ID)) {
    const promptId = info.menuItemId.toString().replace(BROWSER_CONTEXT_PROMPT_ID, "");
    
    try {
      // Get the selected prompt template
      const templates = await PromptManager.getPromptTemplates();
      const selectedTemplate = templates.find(t => t.id === promptId);
      
      if (selectedTemplate) {
        // Get available models
        const downloadedModels = await ModelManager.getAvailableModels();
        
        if (downloadedModels.length === 0) {
          console.error("No models available for chat creation");
          return;
        }
        
        // Create a new chat room with a title based on the template
        // Use the first 20 characters of the template title or the full title if shorter
        const chatTitle = selectedTemplate.title.length > 20 
          ? selectedTemplate.title.substring(0, 20) + "..."
          : selectedTemplate.title;
        
        // Create a new chat room using ChatManager
        const newChatRoom = await ChatManager.createChatRoom(
          chatTitle,
          downloadedModels[0],
          selectedTemplate.content,
          true
        );
        
        // Save the current chat ID
        await browser.storage.local.set({ 
          [StorageKey.CURRENT_CHAT_ID]: newChatRoom.id 
        });
        
        // Store the highlighted text if available
        const highlightedText = info.selectionText || '';
        
        // Store the redirect information for the side panel
        await browser.storage.local.set({
          [StorageKey.SIDE_PANEL_REDIRECT]: `/chats/${newChatRoom.id}`,
          [StorageKey.SIDE_PANEL_MESSAGE]: `Created new chat: ${chatTitle}`,
          [StorageKey.HIGHLIGHTED_TEXT]: highlightedText
        });
        
        // Try to send a message to the side panel first
        try {
          await browser.runtime.sendMessage({
            action: 'UPDATE_CHAT_DETAIL',
            chatId: newChatRoom.id,
            highlightedText: highlightedText
          });
        } catch (error) {
          console.log('Side panel not open or not ready, will open it');
        }
        
        // Open the side panel
        if (chrome?.sidePanel && tab.windowId) {
          // Send a message to the content script to open the side panel
          browser.tabs.sendMessage(tab.id, {
            action: BrowserAction.OPEN_SIDE_PANEL,
            windowId: tab.windowId
          }).then(() => {
            // Message sent successfully
          }).catch(error => {
            console.error("Error sending message to content script:", error);
            
            // If sending to content script fails, try opening directly from background
            if (tab.windowId) {
              chrome.sidePanel.open({ windowId: tab.windowId })
                .catch(err => {
                  console.error("Error opening side panel from background script:", err);
                });
            }
          });
        } else {
          console.log("Cannot open side panel:", {
            hasSidePanel: !!chrome?.sidePanel,
            hasWindowId: !!tab.windowId
          });
        }
      }
    } catch (error) {
      console.error("Error handling prompt selection:", error);
    }
  }
});

// Listen for changes to prompt templates to update the context menu
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[StorageKey.PROMPT_TEMPLATES]) {
    createPromptContextMenu();
  }
});

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === BrowserAction.OPEN_SIDE_PANEL_FROM_BUTTON) {
    const windowId = message.windowId || sender.tab?.windowId;
    
    if (chrome?.sidePanel && windowId) {
      chrome.sidePanel.open({ windowId })
        .then(() => {
          sendResponse();
        })
        .catch(error => {
          console.error('Error opening side panel from background script:', error);
          sendResponse();
        });
    } else {
      console.error('Chrome sidePanel API is not available or windowId is missing');
      sendResponse();
    }
    return true; // Indicate we will send a response asynchronously
  }
});

// --- MLC Service Worker Logic (merged) ---
import { CreateServiceWorkerMLCEngine, ServiceWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

let mlcEngine: any = null;
let mlcHandler: ServiceWorkerMLCEngineHandler | null = null;
let mlcCurrentModelId: string | null = null;

browser.runtime.onConnect.addListener((port) => {
  if (port.name !== 'mlc-service-worker') return;
  console.log('Client connected to MLC service worker');

  port.onMessage.addListener(async (message) => {
    console.log('Received message from client:', message);
    try {
      switch (message.type) {
        case 'initialize':
          await handleMLCInitialize(message, port);
          break;
        case 'chat.completions.create':
          await handleMLCChatCompletion(message, port);
          break;
        case 'heartbeat':
          port.postMessage({ id: message.id, type: 'heartbeat', status: 'ok' });
          break;
        default:
          port.postMessage({ id: message.id, error: `Unknown message type: ${message.type}` });
      }
    } catch (error) {
      console.error('Error handling MLC message:', error);
      port.postMessage({ id: message.id, error: error instanceof Error ? error.message : String(error) });
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('Client disconnected from MLC service worker');
  });
});

async function handleMLCInitialize(message: any, port: browser.Runtime.Port): Promise<void> {
  const { modelId, keepAliveMs } = message;
  if (mlcCurrentModelId === modelId && mlcEngine) {
    port.postMessage({ id: message.id, type: 'initialize', status: 'success', message: `Model ${modelId} already initialized` });
    return;
  }
  try {
    console.log(`Initializing model: ${modelId}`);
    mlcEngine = await CreateServiceWorkerMLCEngine(modelId, {
      initProgressCallback: (report) => {
        console.log(`Model loading progress: ${report.progress * 100}%`);
        port.postMessage({ type: 'progress', progress: report.progress });
      }
    }, undefined, keepAliveMs);
    mlcHandler = new ServiceWorkerMLCEngineHandler();
    mlcCurrentModelId = modelId;
    port.postMessage({ id: message.id, type: 'initialize', status: 'success', message: `Model ${modelId} initialized successfully` });
  } catch (error) {
    console.error('Error initializing model:', error);
    port.postMessage({ id: message.id, type: 'initialize', status: 'error', error: error instanceof Error ? error.message : String(error) });
  }
}

async function handleMLCChatCompletion(message: any, port: browser.Runtime.Port): Promise<void> {
  if (!mlcEngine) {
    port.postMessage({ id: message.id, type: 'chat.completions.create', status: 'error', error: 'Model not initialized' });
    return;
  }
  try {
    const { messages, options } = message;
    const response = await mlcEngine.chat.completions.create({ messages, ...options });
    port.postMessage({ id: message.id, type: 'chat.completions.create', status: 'success', response });
  } catch (error) {
    console.error('Error generating chat completion:', error);
    port.postMessage({ id: message.id, type: 'chat.completions.create', status: 'error', error: error instanceof Error ? error.message : String(error) });
  }
}

console.log('MLC service worker logic merged into background.ts');