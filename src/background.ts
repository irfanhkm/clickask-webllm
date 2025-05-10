import browser from "webextension-polyfill";
import { PromptManager, PromptTemplate } from "./pages/PromptManagement/PromptManager";
import { BROWSER_CONTEXT_PROMPT_ID, BrowserAction } from "./constants";

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
        // Get the current chat ID from storage
        const result = await browser.storage.local.get("currentChatId");
        const currentChatId = result.currentChatId;
        
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
        // if (currentChatId) {
        //   // Send message to content script to insert the prompt
        //   browser.tabs.sendMessage(tab.id, {
        //     action: "insertPrompt",
        //     prompt: selectedTemplate.content
        //   });
        // }
      }
    } catch (error) {
      console.error("Error handling prompt selection:", error);
    }
  }
});

// Listen for changes to prompt templates to update the context menu
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.promptTemplates) {
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