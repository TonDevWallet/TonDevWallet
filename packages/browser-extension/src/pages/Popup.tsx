import { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'
import './Popup.css'

export default function () {
  const [currentHost, setCurrentHost] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkCurrentTab() {
      // Get current tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })
      const currentTab = tabs[0]

      if (currentTab?.url) {
        const url = new URL(currentTab.url)
        const host = url.hostname
        setCurrentHost(host)

        // Check if this host is enabled
        const data = await browser.storage.local.get('enabledHosts')
        const enabledHosts = data.enabledHosts || []
        setIsEnabled(enabledHosts.includes(host))
      }

      setIsLoading(false)
    }

    checkCurrentTab()
  }, [])

  const enableForThisSite = async () => {
    if (!currentHost) return

    // Get current tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const currentTab = tabs[0]

    if (!currentTab?.id) return

    // Get currently enabled hosts
    const data = await browser.storage.local.get('enabledHosts')
    const hosts = data.enabledHosts || []

    if (!hosts.includes(currentHost)) {
      // Add host to enabled list
      hosts.push(currentHost)
      await browser.storage.local.set({ enabledHosts: hosts })

      await browser.action.setIcon({ path: '/icon/app-icon.png' })

      try {
        // Inject the script for this tab
        await browser.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['src/inject.js'],
          world: 'MAIN' as any,
        })
      } catch (e) {
        console.error(e)
      }

      setIsEnabled(true)
      window.close()
    } else {
      setIsEnabled(true)
    }
  }

  const disableForThisSite = async () => {
    if (!currentHost) return

    // Get currently enabled hosts
    const data = await browser.storage.local.get('enabledHosts')
    const hosts = data.enabledHosts || []

    // Remove the current host from the enabled list
    const updatedHosts = hosts.filter((host: string) => host !== currentHost)
    await browser.storage.local.set({ enabledHosts: updatedHosts })

    // Update the state
    setIsEnabled(false)

    await browser.action.setIcon({ path: '/icon-disabled/app-icon.png' })

    // Get current tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const currentTab = tabs[0]

    if (currentTab?.id) {
      // Reload the tab to ensure script is no longer active
      browser.tabs.reload(currentTab.id)
    }

    // Close the popup
    window.close()
  }

  return (
    <div className="popup-container">
      <h1>Website Permissions</h1>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="site-info">
            <p>
              <strong>Current website:</strong> {currentHost || 'Not available'}
            </p>
            <p>
              <strong>Status:</strong> {isEnabled ? '✅ Enabled' : '❌ Disabled'}
            </p>
          </div>

          {!isEnabled && currentHost && (
            <button className="enable-button" onClick={enableForThisSite}>
              Enable for this website
            </button>
          )}

          {isEnabled && currentHost && (
            <button className="enable-button" onClick={disableForThisSite}>
              Disable for this website
            </button>
          )}

          {isEnabled && <p className="success-message">Extension is enabled for this website</p>}
        </>
      )}
    </div>
  )
}
