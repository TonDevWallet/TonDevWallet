import TonWeb from 'tonweb'

const { BN, base64ToBytes } = TonWeb.utils
const { Cell } = TonWeb.boc

export class HttpProviderUtils {
  static parseObject(x: any): any {
    const typeName = x['@type']
    switch (typeName) {
      case 'tvm.list':
      case 'tvm.tuple':
        return x.elements.map(HttpProviderUtils.parseObject)
      case 'tvm.stackEntryTuple':
        return HttpProviderUtils.parseObject(x.tuple)
      case 'tvm.stackEntryNumber':
        return HttpProviderUtils.parseObject(x.number)
      case 'tvm.numberDecimal':
        return new BN(x.number, 10)
      default:
        throw new Error('unknown type ' + typeName)
    }
  }

  /**
   * @param pair  {any[]}
   * @return {any}
   */
  static parseResponseStack(pair: any) {
    const typeName = pair[0]
    const value = pair[1]

    switch (typeName) {
      case 'num':
        return new BN(value.replace(/0x/, ''), 16)
      case 'list':
      case 'tuple':
        return HttpProviderUtils.parseObject(value)
      case 'cell': {
        const contentBytes = base64ToBytes(value.bytes)
        return Cell.oneFromBoc(contentBytes)
      }
      default:
        throw new Error('unknown type ' + typeName)
    }
  }

  static parseResponse(result: any) {
    if (result.exit_code !== 0) {
      const err = new Error('http provider parse response error')
      // err.result = result
      throw err
    }

    const arr = result.stack.map(HttpProviderUtils.parseResponseStack)
    return arr.length === 1 ? arr[0] : arr
  }

  static makeArg(arg: any) {
    if (arg instanceof BN || arg instanceof Number) {
      return ['num', arg]
    } else {
      throw new Error('unknown arg type ' + arg)
    }
  }

  static makeArgs(args: any) {
    return args.map(this.makeArg)
  }
}