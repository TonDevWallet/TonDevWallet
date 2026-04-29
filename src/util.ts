const inspectCustom = Symbol.for('nodejs.util.inspect.custom')

type InspectOptions = {
  customInspect?: boolean
  depth?: number
  [key: string]: unknown
}

export function promisify(f: (...args: unknown[]) => void) {
  return function (this: unknown, ...args: unknown[]) {
    return new Promise((resolve, reject) => {
      function callback(err: unknown, result: unknown) {
        if (err) reject(err)
        else resolve(result)
      }

      args.push(callback)
      f.call(this, ...args)
    })
  }
}

function stringify(value: unknown, seen = new WeakSet<object>()): string {
  if (typeof value === 'string') return `'${value}'`
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'symbol') return value.toString()
  if (typeof value === 'function') return `[Function${value.name ? `: ${value.name}` : ''}]`
  if (value === null || typeof value !== 'object') return String(value)

  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    return `[ ${value.map((item) => stringify(item, seen)).join(', ')} ]`
  }

  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`
  if (value instanceof Date) return value.toISOString()
  if (value instanceof RegExp) return value.toString()
  if (value instanceof Map) {
    return `Map(${value.size}) { ${Array.from(value.entries())
      .map(([key, item]) => `${stringify(key, seen)} => ${stringify(item, seen)}`)
      .join(', ')} }`
  }
  if (value instanceof Set) {
    return `Set(${value.size}) { ${Array.from(value.values())
      .map((item) => stringify(item, seen))
      .join(', ')} }`
  }

  return `{ ${Object.keys(value)
    .map((key) => `${key}: ${stringify((value as Record<string, unknown>)[key], seen)}`)
    .join(', ')} }`
}

export function inspect(value: unknown, options: InspectOptions = {}) {
  if (options.customInspect !== false && value && typeof value === 'object') {
    const customInspect = (value as Record<PropertyKey, unknown>)[inspectCustom]

    if (typeof customInspect === 'function') {
      return String(customInspect.call(value, options.depth ?? 2, options))
    }
  }

  return stringify(value)
}

inspect.custom = inspectCustom

const objectToString = (value: unknown) => Object.prototype.toString.call(value)

export const types = {
  isAnyArrayBuffer: (value) =>
    value instanceof ArrayBuffer || objectToString(value) === '[object SharedArrayBuffer]',
  isArrayBufferView: ArrayBuffer.isView,
  isDate: (value) => value instanceof Date,
  isMap: (value) => value instanceof Map,
  isRegExp: (value) => value instanceof RegExp,
  isSet: (value) => value instanceof Set,
  isNativeError: (value) => value instanceof Error,
  isBoxedPrimitive: (value) =>
    value instanceof Number ||
    value instanceof String ||
    value instanceof Boolean ||
    objectToString(value) === '[object BigInt]' ||
    objectToString(value) === '[object Symbol]',
  isNumberObject: (value) => value instanceof Number,
  isStringObject: (value) => value instanceof String,
  isBooleanObject: (value) => value instanceof Boolean,
  isBigIntObject: (value) => objectToString(value) === '[object BigInt]',
  isSymbolObject: (value) => objectToString(value) === '[object Symbol]',
  isFloat32Array: (value) => value instanceof Float32Array,
  isFloat64Array: (value) => value instanceof Float64Array,
  isPromise: (value) =>
    value instanceof Promise ||
    (Boolean(value) && typeof (value as { then?: unknown }).then === 'function'),
}

export default {
  promisify,
  inspect,
  types,
}
