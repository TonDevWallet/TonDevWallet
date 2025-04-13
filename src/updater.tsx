import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

async function checkForUpdates() {
  if (import.meta.env.DEV) {
    return
  }
  console.log('checking for updates')
  const update = await check()

  console.log('update', update)
  if (update) {
    console.log('update found')
    console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`)
    let downloaded = 0
    let contentLength = 0
    if (await window.confirm(`Update ${update.version} found. Download and install?`)) {
      // alternatively we could also call update.download() and update.install() separately
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0
            console.log(`started downloading ${event.data.contentLength} bytes`)
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            console.log(`downloaded ${downloaded} from ${contentLength}`)
            break
          case 'Finished':
            console.log('download finished')
            break
        }
      })

      console.log('update installed')
      await relaunch()
    }
  }
}

checkForUpdates().catch((err) => {
  console.error(err)
})
