// Content script to handle side panel opening
import browser from "webextension-polyfill";
import { BrowserAction } from "./constants";

// Create and inject the floating button
function createFloatingButton() {
  // Check if the button already exists
  if (document.getElementById('clickask-sidepanel-button')) {
    return;
  }

  // Create the button element
  const button = document.createElement('div');
  button.id = 'clickask-sidepanel-button';
  button.title = 'Open ClickAsk Side Panel';
  
  // Style the button
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.width = '50px';
  button.style.height = '50px';
  button.style.borderRadius = '50%';
  button.style.backgroundColor = '#4285f4';
  button.style.color = 'white';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.cursor = 'pointer';
  button.style.zIndex = '9999';
  button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  button.style.transition = 'transform 0.2s, background-color 0.2s';
  
  // Add hover effect
  button.addEventListener('mouseover', () => {
    button.style.transform = 'scale(1.1)';
    button.style.backgroundColor = '#3367d6';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.transform = 'scale(1)';
    button.style.backgroundColor = '#4285f4';
  });
  
  // Add the icon (using a simple text as icon)
  button.innerHTML = 'ClickAsk';
  
  // Add click event to open the side panel
  button.addEventListener('click', () => {
    // Send a message to the background script to open the side panel
    browser.runtime.sendMessage({ action: BrowserAction.OPEN_SIDE_PANEL_FROM_BUTTON })
      .catch(error => {
        console.error('Error sending message to background script:', error);
      });
  });
  
  // Add the button to the page
  document.body.appendChild(button);
}

// Create the button when the page loads
createFloatingButton();

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check for both string and enum values
  if (message.action === BrowserAction.OPEN_SIDE_PANEL) {
    // Forward the request to the background script to open the side panel
    browser.runtime.sendMessage({
      action: BrowserAction.OPEN_SIDE_PANEL_FROM_BUTTON,
      windowId: message.windowId
    }).then(() => {
      sendResponse();
    }).catch(error => {
      console.error("Error sending message to background script:", error);
      sendResponse();
    });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
}); 