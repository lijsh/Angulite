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

  static isIdent(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$'
  }

  static isWhiteSpace(ch) {
    return ch === ' ' || ch === '\r' || ch === '\t' ||
      ch === '\n' || ch === '\v' || ch === '\u00A0'
  }

  lex(text) {
    this.text = text
    this.index = 0
    this.tokens = []
    while (this.index < this.text.length) {
      this.ch = this.text.charAt(this.index)
      if (Lexer.isNumber(this.ch) ||
        (this.is('.') && Lexer.isNumber(this.peek()))) {
        this.readNumber()
      } else if (this.is('\'"')) {
        this.readString(this.ch)
      } else if (Lexer.isIdent(this.ch)) {
        this.readIdent()
      } else if (Lexer.isWhiteSpace(this.ch)) {
        this.index++
      } else if (this.is('{}:[],')) {
        this.tokens.push({ text: this.ch })
        this.index++
      } else {
        throw `Unexpected next character: ${this.ch}` // eslint-disable-line
      }
    }
    return this.tokens
  }

  is(chs) {
    return chs.indexOf(this.ch) > -1
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

  readIdent() {
    let text = ''
    while (this.index < this.text.length) {
      const ch = this.text.charAt(this.index)
      if (Lexer.isIdent(ch) || Lexer.isNumber(ch)) {
        text += ch
      } else {
        break
      }
      this.index++
    }
    this.tokens.push({ text, identifier: true })
  }
}

class AST {
  static Program = 'Program'
  static Literal = 'Literal'
  static ArrayExpression = 'ArrayExpression'
  static ObjectExpression = 'ObjectExpression'
  static Property = 'Property'
  static Identifier = 'Identifier'
  static constants = {
    null: { type: AST.Literal, value: null },
    false: { type: AST.Literal, value: false },
    true: { type: AST.Literal, value: true },
  }
  constructor(lexer) {
    this.lexer = lexer
  }

  ast(text) {
    this.tokens = this.lexer.lex(text)
    return this.program()
  }

  program() {
    return { type: AST.Program, body: this.primary() }
  }

  primary() {
    if (this.expect('[')) {
      return this.arrayDeclaration()
    } else if (this.expect('{')) {
      return this.object()
    } else if (Object.prototype.hasOwnProperty.call(AST.constants, this.tokens[0].text)) {
      return AST.constants[this.consume().text]
    }
    return this.constant()
  }

  constant() {
    return {
      type: AST.Literal,
      value: this.consume().value,
    }
  }

  identifier() {
    return {
      type: AST.Identifier,
      name: this.consume().text,
    }
  }

  peek(ch) {
    if (this.tokens.length > 0) {
      if (this.tokens[0].text === ch || !ch) {
        return this.tokens[0]
      }
    }
    return null
  }

  expect(ch) {
    const token = this.peek(ch)
    if (token) {
      return this.tokens.shift()
    }
    return null
  }

  consume(ch) {
    const token = this.expect(ch)
    if (!token) {
      throw `Unexpected. Expecting: ${ch}` // eslint-disable-line
    }
    return token
  }

  arrayDeclaration() {
    const elements = []
    if (!this.peek(']')) {
      do {
        if (this.peek(']')) break
        elements.push(this.primary())
      } while (this.expect(','))
    }
    this.consume(']')
    return { type: AST.ArrayExpression, elements }
  }

  object() {
    const properties = []
    if (!this.peek('}')) {
      do {
        const property = { type: AST.Property }
        if (this.peek('}')) break
        if (this.peek().identifier) {
          property.key = this.identifier()
        } else {
          property.key = this.primary()
        }
        this.consume(':')
        property.value = this.primary()
        properties.push(property)
      } while (this.expect(','))
    }
    this.consume('}')
    return { type: AST.ObjectExpression, properties }
  }
}

class AstCompiler {
  static StringEscapeFn(c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4) //eslint-disable-line
  }
  static escape(value) {
    if (_.isString(value)) {
      return `'${value.replace(/[^ a-zA-Z0-9]/g, AstCompiler.StringEscapeFn)}'`
    } else if (_.isNull(value)) {
      return 'null'
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
    let elements
    let properties
    switch (ast.type) {
      case AST.Program:
        this.state.body.push('return ', this.recurse(ast.body), ';')
        return null
      case AST.Literal:
        return AstCompiler.escape(ast.value)
      case AST.ArrayExpression:
        elements = ast.elements.map((element) => this.recurse(element))
        return `[${elements.join(',')}]`
      case AST.ObjectExpression:
        properties = ast.properties.map((property) => {
          const key = property.key.type === AST.Identifier ?
            property.key.name :
            AstCompiler.escape(property.key.value)
          const value = this.recurse(property.value)
          return `${key}:${value}`
        })
        return `{${properties.join(',')}}`
      default:
        return null
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