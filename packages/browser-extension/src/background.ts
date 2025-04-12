import browser from 'webextension-polyfill'

const ICON_ENABLED = {
  128: '/icon/app-icon.png',
}

const ICON_DISABLED = {
  128: '/icon-disabled/app-icon.png',
}

// Function to update the extension icon based on the host
async function updateIcon(url: string | undefined) {
  if (!url) return

  try {
    const tabUrl = new URL(url)
    const host = tabUrl.hostname

    const enabledHosts = await getEnabledHosts()

    // Check if this host is enabled
    const isEnabled = enabledHosts.includes(host)

    // Set the appropriate icon
    const iconPath = isEnabled ? ICON_ENABLED : ICON_DISABLED

    // Update the icon
    await browser.action.setIcon({ path: iconPath[128] })
  } catch (error) {
    console.error('Error updating icon:', error)
  }
}

// Handle browser action click to enable on current tab
browser.action.onClicked.addListener(async (tab) => {
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

    // Inject the script for this tab
    await injectContentScript(tab.id)

    // Update the extension icon to reflect the enabled state
    await updateIcon(tab.url)

    // Reload the tab to ensure script runs
    browser.tabs.reload(tab.id)
  }
})

async function getEnabledHosts(): Promise<string[]> {
  const data = await browser.storage.local.get('enabledHosts')
  const hosts = data.enabledHosts || []
  return hosts
}

// Listen for tab updates to check if we should inject the script
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const url = new URL(tab.url)
    const host = url.hostname

    const enabledHosts = await getEnabledHosts()
    if (enabledHosts.includes(host)) {
      await injectContentScript(tabId)
    }
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
