import { TLBMathExpr, TLBNumberExpr, TLBVarExpr, TLBBinaryOp } from '@ton-community/tlb-codegen'

// Interpreter to evaluate TLBMathExpr at runtime
export class MathExprEvaluator {
  private variables: Map<string, number>

  constructor(variables: Map<string, number> = new Map()) {
    this.variables = variables
  }

  evaluate(expr: TLBMathExpr): number {
    if (expr instanceof TLBNumberExpr) {
      return expr.n
    }
    if (expr instanceof TLBVarExpr) {
      const value = this.variables.get(expr.x)
      if (value === undefined) {
        throw new Error(`Variable ${expr.x} is not defined`)
      }
      return value
    }
    if (expr instanceof TLBBinaryOp) {
      const left = this.evaluate(expr.left)
      const right = this.evaluate(expr.right)
      switch (expr.operation) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '/':
          return Math.floor(left / right)
        case '%':
          return left % right
        case '<<':
          return left << right
        case '>>':
          return left >> right
        case '&':
          return left & right
        case '|':
          return left | right
        case '^':
          return left ^ right
        case '==':
          return left === right ? 1 : 0
        case '!=':
          return left !== right ? 1 : 0
        case '<':
          return left < right ? 1 : 0
        case '<=':
          return left <= right ? 1 : 0
        case '>':
          return left > right ? 1 : 0
        case '>=':
          return left >= right ? 1 : 0
        case '=':
          return left === right ? 1 : 0
        default:
          throw new Error(`Unknown operation: ${expr.operation}`)
      }
    }
    // TLBUnaryOp
    // FIXME
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = this.evaluate((expr as any).value)
    // FIXME
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operation = (expr as any).operation
    switch (operation) {
      case '-':
        return -value
      case '~':
        return ~value
      case '!':
        return value ? 0 : 1
      case '.':
        return value
      default:
        throw new Error(`Unknown unary operation: ${operation}`)
    }
  }
}
