import { Address, Cell, Dictionary } from '@ton/core'
import { parseWithPayloads } from '@truecarry/tlb-abi'
import { parseUsingBlockTypes } from './blockParser'

export function sanitizeObject(obj: any) {
  if (obj instanceof Cell) {
    return obj.toBoc().toString('hex')
  }

  if (obj instanceof Address) {
    return obj.toString()
  }

  if (obj instanceof Buffer) {
    return obj.toString('hex')
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key])
      }
    }
    return sanitized
  }

  if (typeof obj === 'bigint') {
    return obj.toString()
  }

  if (typeof obj === 'function') {
    return undefined
  }

  return obj
}

// Recursively parse a cell with block types
export function ParseCellWithBlock(cell: Cell) {
  let parsed: any
  try {
    parsed = parseWithPayloads(cell.beginParse())
    if (parsed) {
      return parsed
    }
  } catch (e) {
    console.error(e)
  }

  try {
    parsed = parseUsingBlockTypes(cell)
    if (parsed) {
      return parsed
    }
  } catch (e) {
    console.error(e)
  }

  return undefined
}

export function RecursivelyParseCellWithBlock(cell: Cell) {
  let parsed = ParseCellWithBlock(cell)
  while (true) {
    const { data, hasChanges } = replaceCellPayload(parsed)
    parsed = data
    if (!hasChanges) {
      break
    }
  }
  return parsed
}

export function replaceCellPayload<T>(obj: T): {
  data: T
  hasChanges: boolean
} {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return {
      data: obj,
      hasChanges: false,
    }
  }

  if (obj instanceof Dictionary) {
    const dictData = obj.keys().reduce((acc, key) => {
      acc[key] = obj.get(key)
      return acc
    }, {} as any)
    return {
      data: dictData,
      hasChanges: true,
    }
  }

  // Direct JettonPayload case
  if (obj instanceof Cell) {
    try {
      const parsedCell = ParseCellWithBlock(obj)
      if (parsedCell) {
        return {
          data: {
            data: obj.toBoc().toString('hex'),
            parsed: parsedCell,
          } as any,
          hasChanges: true,
        }
      }

      return {
        data: obj,
        hasChanges: false,
      }
    } catch (e) {
      // Not a valid Jetton payload, leave as is
    }
    return {
      data: obj,
      hasChanges: false,
    }
  }

  // Array case
  if (Array.isArray(obj)) {
    const replaced = obj.map((item) => replaceCellPayload(item))
    const hasChanges = replaced.some((item) => item.hasChanges)
    return {
      data: hasChanges ? (replaced.map((item) => item.data) as any) : obj,
      hasChanges,
    }
  }

  // Regular object case
  let hasChanges = false
  const result = { ...obj } as any

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const { data, hasChanges: hasChangesInner } = replaceCellPayload((obj as any)[key])
      if (hasChangesInner) {
        hasChanges = true
        result[key] = data
      }
    }
  }

  // Return original object if no changes were made
  return {
    data: hasChanges ? result : obj,
    hasChanges,
  }
}
