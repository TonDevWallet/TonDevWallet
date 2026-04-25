import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { cpus } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, type Browser, type Page } from 'playwright'
import sharp from 'sharp'

type AppTheme = 'light' | 'dark'

type StorybookEntry = {
  id: string
  title: string
  name: string
  type?: string
}

type StorybookIndex = {
  entries?: Record<string, StorybookEntry>
  stories?: Record<string, StorybookEntry>
}

type CapturedStory = {
  id: string
  title: string
  name: string
  theme: AppTheme
  file: string
  height: number
  width: number
  errors: string[]
}

type CaptureJob = {
  globalIndex: number
  entry: StorybookEntry
  theme: AppTheme
}

type Tile = {
  input: Buffer
  width: number
  height: number
}

const require = createRequire(import.meta.url)

const args = new Map<string, string>(
  process.argv.slice(2).flatMap((arg): [string, string][] => {
    if (!arg.startsWith('--')) return []
    const [key, ...valueParts] = arg.slice(2).split('=')
    return [[key, valueParts.join('=') || 'true']]
  })
)

if (args.has('help')) {
  console.log(`Usage: pnpm storybook:atlas [options]

Options:
  --url=http://127.0.0.1:6006   Existing Storybook URL to reuse
  --port=6006                   Port to start Storybook on when --url is not running
  --out=storybook-atlas         Output directory
  --themes=light,dark           Comma-separated app themes to capture
  --columns=4                   Atlas columns
  --tile-width=1440             Width of each atlas tile / capture viewport by default
  --tile-height=900             Height of each screenshot area in the atlas
  --viewport=1440x900           Browser viewport for captures
  --delay=750                   Extra delay before each capture after readiness checks
  --concurrency=32              Parallel captures, default min(CPU count * 2, 32)
  --full-page                   Capture full story page before fitting into fixed tile
`)
  process.exit(0)
}

const port = numberOption('port', 6006)
const baseUrl = normalizeUrl(
  stringOption('url', process.env.STORYBOOK_ATLAS_URL ?? `http://127.0.0.1:${port}`)
)
const outDir = resolve(
  process.cwd(),
  stringOption('out', process.env.STORYBOOK_ATLAS_OUT ?? 'storybook-atlas')
)
const screenshotsDir = join(outDir, 'screenshots')
const themes = listOption('themes', process.env.STORYBOOK_ATLAS_THEMES ?? 'light,dark').filter(
  (theme): theme is AppTheme => theme === 'light' || theme === 'dark'
)
if (themes.length === 0) {
  throw new Error(
    'No valid themes selected. Use --themes=light,dark, --themes=light, or --themes=dark'
  )
}
const columns = numberOption('columns', Number(process.env.STORYBOOK_ATLAS_COLUMNS) || 4)
const [viewportWidth, viewportHeight] = parseViewport(
  stringOption('viewport', process.env.STORYBOOK_ATLAS_VIEWPORT ?? '1440x900')
)
const concurrency = numberOption(
  'concurrency',
  Number(process.env.STORYBOOK_ATLAS_CONCURRENCY) || Math.min(cpus().length * 2, 32)
)
const tileWidth = numberOption(
  'tile-width',
  Number(process.env.STORYBOOK_ATLAS_TILE_WIDTH) || viewportWidth
)
const tileImageHeight = numberOption(
  'tile-height',
  Number(process.env.STORYBOOK_ATLAS_TILE_HEIGHT) || viewportHeight
)
const screenshotDelayMs = numberOption('delay', Number(process.env.STORYBOOK_ATLAS_DELAY_MS) || 750)
const fullPageScreenshots = booleanOption(
  'full-page',
  process.env.STORYBOOK_ATLAS_FULL_PAGE === 'true'
)

let storybookProcess: ChildProcessWithoutNullStreams | undefined

try {
  await rm(outDir, { recursive: true, force: true })
  await mkdir(screenshotsDir, { recursive: true })

  storybookProcess = await ensureStorybook()
  const entries = await loadStoryEntries()
  if (entries.length === 0) {
    throw new Error('No Storybook stories found in index.json')
  }

  const captures = await captureStories(entries)
  const atlasPath = await buildAtlas(captures)
  await writeManifest(captures, atlasPath)

  console.log(`Captured ${captures.length} story screenshots into ${outDir}`)
  console.log(`Atlas: ${atlasPath}`)
} catch (error) {
  if (String(error).includes("Executable doesn't exist")) {
    console.error(
      'Playwright Chromium is not installed and no system Chromium channel could be launched. Run: pnpm exec playwright install chromium'
    )
  }
  console.error(error)
  process.exitCode = 1
} finally {
  stopStorybook(storybookProcess)
}

async function ensureStorybook() {
  if (await isStorybookRunning()) {
    console.log(`Using existing Storybook at ${baseUrl}`)
    return undefined
  }

  console.log(`Starting Storybook at ${baseUrl}`)
  const child = spawn(
    process.execPath,
    [storybookCliPath(), 'dev', '--port', String(port), '--ci', '--no-open'],
    {
      cwd: process.cwd(),
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  child.stdout.on('data', (data) => process.stdout.write(`[storybook] ${data}`))
  child.stderr.on('data', (data) => process.stderr.write(`[storybook] ${data}`))

  await waitForStorybook(120_000)
  return child
}

function storybookCliPath() {
  return require.resolve('storybook/internal/bin/dispatcher')
}

async function isStorybookRunning() {
  try {
    const response = await fetch(`${baseUrl}/index.json`, { signal: AbortSignal.timeout(2_000) })
    return response.ok
  } catch {
    return false
  }
}

async function waitForStorybook(timeoutMs: number) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isStorybookRunning()) return
    await delay(1_000)
  }
  throw new Error(`Storybook did not become ready at ${baseUrl} within ${timeoutMs}ms`)
}

async function loadStoryEntries() {
  const response = await fetch(`${baseUrl}/index.json`)
  if (!response.ok) {
    throw new Error(`Failed to read Storybook index: HTTP ${response.status}`)
  }

  const index = (await response.json()) as StorybookIndex
  const entries = Object.values(index.entries ?? index.stories ?? {})

  return entries
    .filter((entry) => entry.type === 'story')
    .sort((a, b) => `${a.title}/${a.name}`.localeCompare(`${b.title}/${b.name}`))
}

async function launchCaptureBrowser() {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    if (!String(error).includes("Executable doesn't exist")) throw error

    for (const channel of ['msedge', 'chrome'] as const) {
      try {
        return await chromium.launch({ channel, headless: true })
      } catch {
        // Try the next installed system browser channel.
      }
    }

    throw error
  }
}

async function captureStories(entries: StorybookEntry[]) {
  const browser = await launchCaptureBrowser()
  const jobs = themes.flatMap((theme, themeIndex) =>
    entries.map((entry, entryIndex) => ({
      globalIndex: themeIndex * entries.length + entryIndex + 1,
      entry,
      theme,
    }))
  )

  console.log(
    `Capturing ${jobs.length} stories with concurrency ${Math.min(concurrency, jobs.length)}`
  )

  try {
    return await mapLimit(jobs, concurrency, (job) => captureStory(browser, job))
  } finally {
    await browser.close()
  }
}

async function captureStory(browser: Browser, job: CaptureJob): Promise<CapturedStory> {
  const context = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor: 1,
  })
  await context.addInitScript(`
    (() => {
      const theme = ${JSON.stringify(job.theme)} === 'dark' ? 'dark' : 'light';
      const applyTheme = () => {
        const root = document.documentElement;
        if (!root) return;
        root.classList.toggle('dark', theme === 'dark');
        root.dataset.storybookAtlasTheme = theme;
        try {
          localStorage.setItem('theme', JSON.stringify(theme));
        } catch {
          // Storage may be disabled in some browser contexts.
        }
      };

      applyTheme();
      document.addEventListener('DOMContentLoaded', applyTheme, { once: true });
    })();
  `)
  const page = await context.newPage()
  const { entry, globalIndex, theme } = job
  const file = join(screenshotsDir, `${pad(globalIndex)}-${theme}-${safeFileName(entry.id)}.png`)
  const errors: string[] = []
  const onPageError = (error: Error) => errors.push(error.message)
  const onConsole = (message: { type: () => string; text: () => string }) => {
    const text = message.text()
    if (message.type() === 'error' && !isIgnoredConsoleError(text)) errors.push(text)
  }

  page.on('pageerror', onPageError)
  page.on('console', onConsole)

  try {
    console.log(`Capturing [${theme}] ${entry.title} / ${entry.name}`)
    await page.goto(storyUrl(entry, theme), { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)
    await page.waitForSelector('#storybook-root', { timeout: 30_000 })
    await applyStoryTheme(page, theme)
    await page.evaluate(() => document.fonts?.ready)
    await page.addStyleTag({
      content: `
        html, body, #storybook-root { min-height: 100% !important; background: hsl(var(--background)) !important; }
        #storybook-root > * { min-height: 100vh !important; }
        body.sb-show-main { overflow: auto !important; background: hsl(var(--background)) !important; }
      `,
    })
    await waitForStoryReady(page, entry, theme)

    const errorLocator = page
      .locator('[data-testid="story-error"], .sb-errordisplay, .sb-errordisplay_main')
      .first()
    const hasStoryError = await errorLocator.isVisible({ timeout: 750 }).catch(() => false)
    if (hasStoryError) {
      const storyError = await errorLocator.textContent().catch(() => null)
      if (storyError) errors.push(storyError.trim())
    }

    await page.screenshot({ path: file, fullPage: fullPageScreenshots })
    const metadata = await sharp(file).metadata()

    return {
      id: entry.id,
      title: entry.title,
      name: entry.name,
      theme,
      file,
      width: metadata.width ?? viewportWidth,
      height: metadata.height ?? viewportHeight,
      errors: unique(errors),
    }
  } finally {
    page.off('pageerror', onPageError)
    page.off('console', onConsole)
    await context.close()
  }
}

async function applyStoryTheme(page: Page, theme: AppTheme) {
  await page.evaluate((selectedTheme) => {
    const appTheme = selectedTheme === 'dark' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', appTheme === 'dark')
    document.documentElement.dataset.storybookAtlasTheme = appTheme
    try {
      localStorage.setItem('theme', JSON.stringify(appTheme))
    } catch {
      // Storage may be disabled in some browser contexts.
    }
  }, theme)
  await page
    .waitForFunction(
      (selectedTheme) =>
        document.documentElement.classList.contains('dark') === (selectedTheme === 'dark'),
      theme,
      { timeout: 5_000 }
    )
    .catch(() => undefined)
}

async function waitForStoryReady(page: Page, entry: StorybookEntry, theme: AppTheme) {
  await applyStoryTheme(page, theme)

  if (entry.id.includes('transaction-info-raw')) {
    await page.locator('.monaco-editor').first().waitFor({ state: 'visible', timeout: 30_000 })
  }

  if (entry.id.includes('tracer-tabs')) {
    await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 20_000 })
  }

  await page
    .waitForFunction(
      () =>
        !document.body.innerText.includes('Loading story') &&
        !document.body.innerText.includes('Loading transaction story') &&
        !document.body.innerText.includes('Loading...'),
      undefined,
      { timeout: 10_000 }
    )
    .catch(() => undefined)

  await page.waitForTimeout(screenshotDelayMs)
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  const workerCount = Math.min(limit, items.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = nextIndex++
        if (currentIndex >= items.length) return
        results[currentIndex] = await worker(items[currentIndex])
      }
    })
  )

  return results
}

async function buildAtlas(captures: CapturedStory[]) {
  const tiles: Tile[] = []
  for (const [index, capture] of captures.entries()) {
    tiles.push(await buildTile(capture, index + 1, captures.length))
  }

  const gap = 24
  const padding = 24
  const rows = Math.ceil(tiles.length / columns)
  const placements = tiles.map((tile, index) => ({
    input: tile.input,
    left: padding + (index % columns) * (tileWidth + gap),
    top: padding + Math.floor(index / columns) * (tile.height + gap),
  }))
  const atlasWidth = padding * 2 + columns * tileWidth + (columns - 1) * gap
  const atlasHeight = padding * 2 + rows * tiles[0].height + Math.max(0, rows - 1) * gap
  const atlasPath = join(outDir, 'atlas.png')

  await sharp({
    create: {
      width: atlasWidth,
      height: atlasHeight,
      channels: 4,
      background: '#0f172a',
    },
  })
    .composite(placements)
    .png()
    .toFile(atlasPath)

  await writeAtlasHtml(captures)

  return atlasPath
}

async function writeAtlasHtml(captures: CapturedStory[]) {
  const gap = 48
  const padding = 80
  const headerHeight = 88
  const cardWidth = tileWidth
  const cardHeight = headerHeight + tileImageHeight
  const rows = Math.ceil(captures.length / columns)
  const canvasWidth = padding * 2 + columns * cardWidth + (columns - 1) * gap
  const canvasHeight = padding * 2 + rows * cardHeight + Math.max(0, rows - 1) * gap
  const initialScale = Math.min(0.32, 1200 / Math.max(canvasWidth, 1))

  const cards = (
    await Promise.all(
      captures.map(async (capture, index) => {
        const shotNumber = index + 1
        const left = padding + (index % columns) * (cardWidth + gap)
        const top = padding + Math.floor(index / columns) * (cardHeight + gap)
        const title = `${capture.title} / ${capture.name}`
        const status = capture.errors.length > 0 ? `${capture.errors.length} error(s)` : 'ok'
        const imageSrc = await imageDataUri(capture.file)
        const storyHref = storyUrl(capture, capture.theme)

        return `
        <figure class="shot${capture.errors.length > 0 ? ' has-errors' : ''}" id="shot-${shotNumber}" data-shot="${shotNumber}" data-x="${left}" data-y="${top}" style="left:${left}px;top:${top}px;width:${cardWidth}px">
          <figcaption>
            <div class="shot-title"><span>${shotNumber}/${captures.length}</span>${escapeHtml(title)}</div>
            <div class="shot-meta"><span>${escapeHtml(capture.theme)}</span><span>${escapeHtml(capture.id)}</span><span>${escapeHtml(status)}</span><a href="${escapeHtml(storyHref)}" target="_blank" rel="noreferrer">open story</a></div>
          </figcaption>
          <img src="${imageSrc}" width="${capture.width}" height="${capture.height}" loading="lazy" alt="${escapeHtml(title)} (${escapeHtml(capture.theme)})" />
        </figure>`
      })
    )
  ).join('\n')

  const navItems = captures
    .map((capture, index) => {
      const shotNumber = index + 1
      return `<button type="button" data-target="${shotNumber}"><span>${shotNumber}</span>${escapeHtml(capture.theme)} - ${escapeHtml(capture.name)}</button>`
    })
    .join('\n')

  await writeFile(
    join(outDir, 'atlas.html'),
    `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Storybook Atlas</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; overflow: hidden; background: #0f172a; color: #e2e8f0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    button, a { font: inherit; }
    #viewport { position: fixed; inset: 0; overflow: hidden; touch-action: none; }
    #canvas { position: absolute; left: 0; top: 0; width: ${canvasWidth}px; height: ${canvasHeight}px; transform-origin: 0 0; will-change: transform; }
    .shot { position: absolute; margin: 0; overflow: hidden; border: 1px solid #334155; border-radius: 18px; background: #111827; box-shadow: 0 24px 80px rgb(0 0 0 / 35%); }
    .shot.has-errors { border-color: #ef4444; }
    .shot figcaption { height: ${headerHeight}px; padding: 16px 18px; border-bottom: 1px solid #334155; background: #111827; }
    .shot-title { display: flex; gap: 12px; align-items: baseline; font-size: 18px; font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shot-title span { color: #93c5fd; font-variant-numeric: tabular-nums; }
    .shot-meta { display: flex; gap: 12px; align-items: center; margin-top: 10px; color: #94a3b8; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .shot-meta a { color: #60a5fa; text-decoration: none; }
    .shot img { display: block; width: ${cardWidth}px; height: ${tileImageHeight}px; object-fit: contain; background: #0f172a; user-select: none; -webkit-user-drag: none; }
    #toolbar { position: fixed; z-index: 10; left: 16px; top: 16px; display: flex; gap: 8px; align-items: center; padding: 10px 12px; border: 1px solid #334155; border-radius: 14px; background: rgb(15 23 42 / 90%); backdrop-filter: blur(12px); box-shadow: 0 12px 48px rgb(0 0 0 / 28%); }
    #toolbar strong { margin-right: 8px; }
    #toolbar button { border: 1px solid #475569; border-radius: 10px; background: #1e293b; color: #e2e8f0; padding: 6px 10px; cursor: pointer; }
    #toolbar button:hover { background: #334155; }
    #hint { color: #94a3b8; font-size: 13px; }
    #navigator { position: fixed; z-index: 10; right: 16px; top: 16px; bottom: 16px; width: 280px; display: flex; flex-direction: column; gap: 6px; padding: 12px; overflow: auto; border: 1px solid #334155; border-radius: 16px; background: rgb(15 23 42 / 88%); backdrop-filter: blur(12px); box-shadow: 0 12px 48px rgb(0 0 0 / 28%); }
    #navigator button { display: grid; grid-template-columns: 34px 1fr; gap: 8px; align-items: center; width: 100%; border: 0; border-radius: 10px; background: transparent; color: #cbd5e1; padding: 7px 8px; text-align: left; cursor: pointer; }
    #navigator button:hover, #navigator button.active { background: #1e293b; color: #f8fafc; }
    #navigator span { color: #93c5fd; font-variant-numeric: tabular-nums; }
    body.is-space #viewport { cursor: grab; }
    body.is-panning #viewport { cursor: grabbing; }
    @media (max-width: 900px) { #navigator { left: 16px; right: 16px; top: auto; width: auto; height: 190px; } #hint { display: none; } }
  </style>
</head>
<body>
  <div id="viewport"><main id="canvas" aria-label="Storybook screenshots canvas">${cards}</main></div>
  <div id="toolbar"><strong>Storybook Atlas</strong><button type="button" data-zoom="out">&minus;</button><button type="button" data-zoom="in">+</button><button type="button" data-reset>Reset</button><span id="zoom">100%</span><span id="hint">Hold Space + drag, wheel/trackpad pans, Ctrl/Cmd + wheel zooms</span></div>
  <nav id="navigator" aria-label="Screenshots">${navItems}</nav>
  <script>
    (() => {
      const viewport = document.getElementById('viewport');
      const canvas = document.getElementById('canvas');
      const zoomLabel = document.getElementById('zoom');
      const nav = [...document.querySelectorAll('[data-target]')];
      let scale = ${initialScale.toFixed(4)};
      let x = 24;
      let y = 86;
      let space = false;
      let panning = false;
      let startX = 0;
      let startY = 0;
      let originX = 0;
      let originY = 0;

      function apply() {
        canvas.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
        zoomLabel.textContent = Math.round(scale * 100) + '%';
      }

      function zoomAt(nextScale, clientX = innerWidth / 2, clientY = innerHeight / 2) {
        nextScale = Math.min(1.5, Math.max(0.08, nextScale));
        const worldX = (clientX - x) / scale;
        const worldY = (clientY - y) / scale;
        scale = nextScale;
        x = clientX - worldX * scale;
        y = clientY - worldY * scale;
        apply();
      }

      function focusShot(number) {
        const shot = document.getElementById('shot-' + number);
        if (!shot) return;
        const sx = Number(shot.dataset.x) + ${cardWidth / 2};
        const sy = Number(shot.dataset.y) + ${cardHeight / 2};
        x = innerWidth / 2 - sx * scale;
        y = innerHeight / 2 - sy * scale;
        nav.forEach((item) => item.classList.toggle('active', item.dataset.target === String(number)));
        history.replaceState(null, '', '#shot-' + number);
        apply();
      }

      addEventListener('keydown', (event) => {
        if (event.code === 'Space') {
          space = true;
          document.body.classList.add('is-space');
          event.preventDefault();
        } else if (event.key === '+') {
          zoomAt(scale * 1.15);
        } else if (event.key === '-') {
          zoomAt(scale / 1.15);
        } else if (event.key === '0') {
          scale = ${initialScale.toFixed(4)}; x = 24; y = 86; apply();
        }
      });
      addEventListener('keyup', (event) => {
        if (event.code === 'Space') {
          space = false;
          document.body.classList.remove('is-space');
        }
      });
      viewport.addEventListener('pointerdown', (event) => {
        if (!space && event.pointerType !== 'touch' && event.button !== 1) return;
        panning = true;
        startX = event.clientX;
        startY = event.clientY;
        originX = x;
        originY = y;
        viewport.setPointerCapture(event.pointerId);
        document.body.classList.add('is-panning');
        event.preventDefault();
      });
      viewport.addEventListener('pointermove', (event) => {
        if (!panning) return;
        x = originX + event.clientX - startX;
        y = originY + event.clientY - startY;
        apply();
      });
      viewport.addEventListener('pointerup', () => {
        panning = false;
        document.body.classList.remove('is-panning');
      });
      viewport.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          zoomAt(scale * Math.exp(-event.deltaY / 500), event.clientX, event.clientY);
        } else {
          x -= event.deltaX;
          y -= event.deltaY;
          apply();
        }
      }, { passive: false });
      document.querySelector('[data-zoom="in"]').addEventListener('click', () => zoomAt(scale * 1.2));
      document.querySelector('[data-zoom="out"]').addEventListener('click', () => zoomAt(scale / 1.2));
      document.querySelector('[data-reset]').addEventListener('click', () => { scale = ${initialScale.toFixed(4)}; x = 24; y = 86; apply(); });
      nav.forEach((item) => item.addEventListener('click', () => focusShot(item.dataset.target)));
      apply();
      if (location.hash.startsWith('#shot-')) focusShot(location.hash.slice(6));
    })();
  </script>
</body>
</html>
`
  )
}

async function buildTile(capture: CapturedStory, index: number, total: number): Promise<Tile> {
  const labelHeight = 78
  const image = await sharp(capture.file)
    .resize({
      width: tileWidth,
      height: tileImageHeight,
      fit: 'contain',
      background: '#0f172a',
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer()
  const label = Buffer.from(labelSvg(capture, index, total, labelHeight))
  const tileHeight = labelHeight + tileImageHeight
  const borderColor = capture.errors.length > 0 ? '#ef4444' : '#334155'

  const input = await sharp({
    create: {
      width: tileWidth,
      height: tileHeight,
      channels: 4,
      background: '#111827',
    },
  })
    .composite([
      { input: label, left: 0, top: 0 },
      { input: image, left: 0, top: labelHeight },
      {
        input: Buffer.from(
          `<svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="${tileWidth - 1}" height="${tileHeight - 1}" rx="12" ry="12" fill="none" stroke="${borderColor}" stroke-width="1"/></svg>`
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer()

  return { input, width: tileWidth, height: tileHeight }
}

function labelSvg(capture: CapturedStory, index: number, total: number, height: number) {
  const title = truncate(`${capture.title} / ${capture.name}`, 72)
  const subtitle = truncate(`${capture.theme} - ${capture.id}`, 82)
  const status = capture.errors.length > 0 ? ` - ${capture.errors.length} error(s)` : ''

  return `<svg width="${tileWidth}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111827"/>
    <text x="18" y="29" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" fill="#f8fafc">${escapeXml(index.toString())}/${escapeXml(total.toString())} ${escapeXml(title)}</text>
    <text x="18" y="56" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="13" fill="#94a3b8">${escapeXml(subtitle + status)}</text>
  </svg>`
}

async function writeManifest(captures: CapturedStory[], atlasPath: string) {
  await writeFile(
    join(outDir, 'manifest.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        themes,
        viewport: { width: viewportWidth, height: viewportHeight },
        columns,
        concurrency,
        fullPageScreenshots,
        tileWidth,
        tileHeight: tileImageHeight,
        atlas: atlasPath,
        stories: captures,
      },
      null,
      2
    )}\n`
  )
}

function storyUrl(entry: StorybookEntry, theme: AppTheme) {
  const url = new URL('/iframe.html', baseUrl)
  url.searchParams.set('id', entry.id)
  url.searchParams.set('viewMode', 'story')
  url.searchParams.set('globals', `appTheme:${theme}`)
  return url.toString()
}

function stopStorybook(child: ChildProcessWithoutNullStreams | undefined) {
  if (!child?.pid) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    child.kill('SIGTERM')
  }
}

function stringOption(name: string, fallback: string) {
  return args.get(name) ?? fallback
}

function numberOption(name: string, fallback: number) {
  const value = Number(args.get(name) ?? fallback)
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid --${name}: ${args.get(name)}`)
  return Math.floor(value)
}

function booleanOption(name: string, fallback: boolean) {
  const value = args.get(name)
  if (value === undefined) return fallback
  return value.toLowerCase() !== 'false' && value !== '0'
}

function listOption(name: string, fallback: string) {
  return stringOption(name, fallback)
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function parseViewport(value: string): [number, number] {
  const match = /^(\d+)x(\d+)$/i.exec(value)
  if (!match) throw new Error(`Invalid --viewport: ${value}`)
  return [Number(match[1]), Number(match[2])]
}

function normalizeUrl(value: string) {
  return value.replace(/\/$/, '')
}

function safeFileName(value: string) {
  return value
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function pad(value: number) {
  return String(value).padStart(3, '0')
}

async function imageDataUri(file: string) {
  const image = await readFile(file)
  return `data:image/png;base64,${image.toString('base64')}`
}

function isIgnoredConsoleError(message: string) {
  return (
    message.includes('Failed to load resource: the server responded with a status of 404') ||
    message.includes('An empty string ("") was passed to the %s attribute')
  )
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case '"':
        return '&quot;'
      default:
        return '&apos;'
    }
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })
}
