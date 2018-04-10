import _ from 'lodash'

class Lexer {
  static ESCAPES = {
    n: '\n',
    f: '\f',
    r: '\r',
    t: '\t',
    v: '\v',
    '\'': '\'',
    '"': '"',
  }
  static isNumber(ch) {
    return ch >= '0' && ch <= '9'
  }

  static isExpOperator(ch) {
    return ch === '+' || ch === '-' || Lexer.isNumber(ch)
  }

  static isExp(ch) {
    return ch === 'e' || ch === 'E'
  }

  lex(text) {
    this.text = text
    this.index = 0
    this.tokens = []
    while (this.index < this.text.length) {
      this.ch = this.text.charAt(this.index)
      if (Lexer.isNumber(this.ch) ||
        (this.ch === '.' && Lexer.isNumber(this.peek()))) {
        this.readNumber()
      } else if (this.ch === '\'' || this.ch === '"') {
        this.readString(this.ch)
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

  readNumber() {
    let number = ''
    while (this.index < this.text.length) {
      const ch = this.text.charAt(this.index)
      if (ch === '.' || Lexer.isNumber(ch)) {
        number = `${number}${ch}`
      } else {
        const nextCh = this.peek()
        const prevCh = number.charAt(number.length - 1)
        if (Lexer.isExp(ch) && Lexer.isExpOperator(nextCh)) {
          number += ch
        } else if (Lexer.isExpOperator(ch) && Lexer.isExp(prevCh) && nextCh &&
          Lexer.isNumber(nextCh)) {
          number += ch
        } else if (Lexer.isExpOperator(ch) && Lexer.isExp(prevCh) &&
          (!nextCh || !Lexer.isNumber(nextCh))) {
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

  readString(quote) {
    this.index++
    let string = ''
    let escape = false
    while (this.index < this.text.length) {
      const ch = this.text.charAt(this.index)
      if (escape) {
        if (ch === 'u') {
          const hex = this.text.slice(this.index + 1, this.index + 5)
          if (!hex.match(/[0-9a-f]{4}/i)) throw 'Invalid unicode escape' // eslint-disable-line
          this.index += 4
          string += String.fromCharCode(parseInt(hex, 16))
        } else {
          const replacement = Lexer.ESCAPES[ch]
          if (replacement) {
            string += replacement
          } else {
            string += ch
          }
        }
        escape = false
      } else if (ch === quote) {
        this.index++
        this.tokens.push({
          text: string,
          value: string,
        })
        return
      } else if (ch === '\\') {
        escape = true
      } else {
        string += ch
      }
      this.index++
    }
    throw 'Unmatched quote' // eslint-disable-line
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
  static StringEscapeFn(c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4) //eslint-disable-line
  }
  static escape(value) {
    if (_.isString(value)) {
      return `'${value.replace(/[^ a-zA-Z0-9]/g, AstCompiler.StringEscapeFn)}'`
    }
    return value
  }
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
        return AstCompiler.escape(ast.value)
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