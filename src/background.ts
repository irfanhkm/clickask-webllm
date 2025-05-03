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