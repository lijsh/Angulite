class Lexer {
  lex(text) {
    this.text = text
    this.index = 0
    this.tokens = []
    while (this.index < this.text.length) {
      this.ch = this.text.charAt(this.index)
      if (this.isNumber(this.ch) ||
        (this.ch === '.' && this.isNumber(this.peek()))) {
        this.readNumber()
      } else {
        throw `Unexpected next character: ${this.ch}` // eslint-disable-line
      }
    }
    return this.tokens
  }

  peek() {
    return (this.index < this.text.length - 1) ?
      this.text.charAt(this.index + 1) :
      false
  }

  isExpOperator(ch) {
    return ch === '+' || ch === '-' || this.isNumber(ch)
  }

  isExp(ch) {
    return ch === 'e' || ch === 'E'
  }

  isNumber(ch) {
    return ch >= '0' && ch <= '9'
  }

  readNumber() {
    let number = ''
    while (this.index < this.text.length) {
      const ch = this.text.charAt(this.index)
      if (ch === '.' || this.isNumber(ch)) {
        number = `${number}${ch}`
      } else {
        const nextCh = this.peek()
        const prevCh = number.charAt(number.length - 1)
        if (this.isExp(ch) && this.isExpOperator(nextCh)) {
          number += ch
        } else if (this.isExpOperator(ch) && this.isExp(prevCh) && nextCh &&
          this.isNumber(nextCh)) {
          number += ch
        } else if (this.isExpOperator(ch) && this.isExp(prevCh) &&
          (!nextCh || !this.isNumber(nextCh))) {
          throw 'Invalid exponet' // eslint-disable-line
        } else {
          break
        }
      }
      this.index++
    }
    this.tokens.push({
      text: number,
      value: Number(number),
    })
  }
}

class AST {
  static Program = 'Program'
  static Literal = 'Literal'
  constructor(lexer) {
    this.lexer = lexer
  }

  ast(text) {
    this.tokens = this.lexer.lex(text)
    return this.program()
  }

  program() {
    return { type: AST.Program, body: this.constant() }
  }

  constant() {
    return {
      type: AST.Literal,
      value: this.tokens[0].value,
    }
  }
}

class AstCompiler {
  constructor(astBuilder) {
    this.astBuilder = astBuilder
  }

  compile(text) {
    const ast = this.astBuilder.ast(text)
    this.state = { body: [] }
    this.recurse(ast)
    return new Function(this.state.body.join('')) // eslint-disable-line
  }

  recurse(ast) {
    switch (ast.type) {
      case AST.Program:
        this.state.body.push('return ', this.recurse(ast.body), ';')
        break
      case AST.Literal:
        return ast.value
      default:
    }
  }
}

class Parser {
  constructor(lexer) {
    this.lexer = lexer
    this.ast = new AST(this.lexer)
    this.astCompiler = new AstCompiler(this.ast)
  }

  parse(text) {
    return this.astCompiler.compile(text)
  }
}

const parse = expr => {
  const lexer = new Lexer()
  const parser = new Parser(lexer)
  return parser.parse(expr)
}

export default parse