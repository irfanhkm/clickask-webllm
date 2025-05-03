import browser from "webextension-polyfill";

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

// Create context menu
browser.contextMenus.create({
  id: "ask-ai",
  title: "Ask AI about selection",
  contexts: ["selection"],
  visible: false // Initially hidden
});

// Function to update context menu visibility based on current chat
const updateContextMenuVisibility = async () => {
  try {
    const result = await browser.storage.local.get(['currentChatId', 'chats']);
    const currentChatId = result.currentChatId;
    const chats = result.chats || {};
    
    // Check if current chat exists and is visible in context menu
    const isVisible = chats[currentChatId]?.isVisibleInContextMenu ?? false;
    
    browser.contextMenus.update("ask-ai", {
      visible: isVisible
    });
  } catch (error) {
    console.error('Error updating context menu visibility:', error);
  }
};

// Update context menu when storage changes
browser.storage.onChanged.addListener((changes) => {
  if (changes.currentChatId || changes.chats) {
    updateContextMenuVisibility();
  }
});

// Initial update
updateContextMenuVisibility();

// Handle context menu click
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ask-ai" && info.selectionText) {
    // Open the side panel with the selected text
    if (chrome?.sidePanel && tab?.windowId) {
      chrome.sidePanel.open({ windowId: tab.windowId });
      // Store the selected text for the panel to use
      chrome.storage.local.set({ selectedText: info.selectionText });
    } else if (browser?.sidebarAction) {
      browser.sidebarAction.open();
      browser.storage.local.set({ selectedText: info.selectionText });
    }
  }
});