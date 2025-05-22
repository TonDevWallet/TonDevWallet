let logger: typeof console | undefined
if (typeof window !== 'undefined') {
  try {
    const logsEnabled = localStorage?.getItem('devwallet/traces/logs')
    logger = logsEnabled === 'true' ? console : undefined
  } catch (error) {
    //
  }
} else if (typeof process !== 'undefined') {
  if (process.env.DEVWALLET_LOGS === 'true') {
    logger = console
  }
}

export { logger }
