import browser from 'webextension-polyfill'

console.log('Hello from the background!')

// Store for enabled hosts
const enabledHosts = new Set<string>()

// Icons for enabled and disabled states
const ICON_ENABLED = {
  16: '/icon/app-icon.png',
  32: '/icon/app-icon.png',
  48: '/icon/app-icon.png',
  96: '/icon/app-icon.png',
  128: '/icon/app-icon.png',
}

// For disabled state, we'll use grayscale versions of the icons
// Note: You need to create these grayscale icons and add them to public/icon-disabled/ directory
const ICON_DISABLED = {
  16: '/icon-disabled/app-icon.png',
  32: '/icon-disabled/app-icon.png',
  48: '/icon-disabled/app-icon.png',
  96: '/icon-disabled/app-icon.png',
  128: '/icon-disabled/app-icon.png',
}

browser.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details)

  try {
    // Get stored enabled hosts
    const data = await browser.storage.local.get('enabledHosts')
    const hosts = data.enabledHosts || []

    // Update the in-memory set
    enabledHosts.clear()
    hosts.forEach((h: string) => enabledHosts.add(h))
  } catch (e) {
    console.error('Error getting stored enabled hosts:', e)
  }
})

// Function to update the extension icon based on the host
async function updateIcon(url: string | undefined) {
  if (!url) return

  try {
    const tabUrl = new URL(url)
    const host = tabUrl.hostname

    // Check if this host is enabled
    const isEnabled = enabledHosts.has(host)

    // Set the appropriate icon
    const iconPath = isEnabled ? ICON_ENABLED : ICON_DISABLED

    // Update the icon
    await browser.action.setIcon({ path: iconPath })
  } catch (error) {
    console.error('Error updating icon:', error)
  }
}

// Handle browser action click to enable on current tab
browser.action.onClicked.addListener(async (tab) => {
  console.log('browser action clicked', tab)
  if (!tab.url || !tab.id) return

  const url = new URL(tab.url)
  const host = url.hostname

  // Get currently enabled hosts
  const data = await browser.storage.local.get('enabledHosts')
  const hosts = data.enabledHosts || []

  if (!hosts.includes(host)) {
    // Add host to enabled list
    hosts.push(host)
    await browser.storage.local.set({ enabledHosts: hosts })

    // Update the host set in memory
    enabledHosts.add(host)

    // Inject the script for this tab
    await injectContentScript(tab.id)

    // Update the extension icon to reflect the enabled state
    await updateIcon(tab.url)

    // Reload the tab to ensure script runs
    browser.tabs.reload(tab.id)
  }
})

// Listen for tab updates to check if we should inject the script
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const url = new URL(tab.url)
    const host = url.hostname

    // Get stored enabled hosts
    const data = await browser.storage.local.get('enabledHosts')
    const hosts = data.enabledHosts || []

    // Update the in-memory set
    enabledHosts.clear()
    hosts.forEach((h: string) => enabledHosts.add(h))

    if (enabledHosts.has(host)) {
      await injectContentScript(tabId)
    }

    // Update the icon based on the current URL
    await updateIcon(tab.url)
  }

  await updateIcon(tab.url)
})

// Also update icon when tab is activated
browser.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await browser.tabs.get(activeInfo.tabId)
  await updateIcon(tab.url)
})

// Function to inject content script
async function injectContentScript(tabId: number) {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['src/inject.js'],
      world: 'MAIN' as any,
    })
  } catch (error) {
    console.error('Error injecting script:', error)
  }
}
