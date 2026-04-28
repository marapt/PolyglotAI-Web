// AIpolyglots Chrome Extension - Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "polyglot-translate",
    title: "Translate with AIpolyglots",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "polyglot-translate" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: "translate",
      text: info.selectionText,
    });
  }
});
