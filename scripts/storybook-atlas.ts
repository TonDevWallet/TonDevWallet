import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { cpus } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, type Browser } from 'playwright'
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
  --columns=2                   Atlas columns
  --tile-width=1440             Width of each atlas tile / capture viewport by default
  --tile-height=900             Height of each screenshot area in the atlas
  --viewport=1440x900           Browser viewport for captures
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
const columns = numberOption('columns', Number(process.env.STORYBOOK_ATLAS_COLUMNS) || 2)
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
      'Playwright Chromium is not installed. Run: pnpm exec playwright install chromium'
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

async function captureStories(entries: StorybookEntry[]) {
  const browser = await chromium.launch({ headless: true })
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
  const page = await context.newPage()
  const { entry, globalIndex, theme } = job
  const file = join(screenshotsDir, `${pad(globalIndex)}-${theme}-${safeFileName(entry.id)}.png`)
  const errors: string[] = []
  const onPageError = (error: Error) => errors.push(error.message)
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') errors.push(message.text())
  }

  page.on('pageerror', onPageError)
  page.on('console', onConsole)

  try {
    console.log(`Capturing [${theme}] ${entry.title} / ${entry.name}`)
    await page.goto(storyUrl(entry, theme), { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)
    await page.waitForSelector('#storybook-root', { timeout: 30_000 })
    await page.evaluate(() => document.fonts?.ready)
    await page.addStyleTag({
      content: `
        html, body, #storybook-root { min-height: 100% !important; }
        body.sb-show-main { overflow: auto !important; }
      `,
    })
    await page.waitForTimeout(screenshotDelayMs)

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

  await writeFile(
    join(outDir, 'atlas.html'),
    `<!doctype html><html><head><meta charset="utf-8"><title>Storybook Atlas</title><style>body{margin:0;background:#0f172a;overflow:auto}img{display:block;width:auto;height:auto;max-width:none}</style></head><body><img src="./atlas.png" alt="Storybook atlas"></body></html>\n`
  )

  return atlasPath
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
  const subtitle = truncate(`${capture.theme} · ${capture.id}`, 82)
  const status = capture.errors.length > 0 ? ` · ${capture.errors.length} error(s)` : ''

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

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
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
