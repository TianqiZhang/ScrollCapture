chrome.runtime.onInstalled.addListener(() => {
  console.log('ScrollCapture extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['contentScript.js']
  });
});
