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
      } else if (this.is('{}:[],.')) {
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
  static ThisExpression = 'ThisExpression'
  static MemberExpression = 'MemberExpression'
  static constants = {
    null: { type: AST.Literal, value: null },
    false: { type: AST.Literal, value: false },
    true: { type: AST.Literal, value: true },
    this: { type: AST.ThisExpression },
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
    let primary
    if (this.expect('[')) {
      primary = this.arrayDeclaration()
    } else if (this.expect('{')) {
      primary = this.object()
    } else if (Object.prototype.hasOwnProperty.call(AST.constants, this.tokens[0].text)) {
      primary = AST.constants[this.consume().text]
    } else if (this.peek().identifier) {
      primary = this.identifier()
    } else {
      primary = this.constant()
    }
    let next
    while ((next = this.expect('.', '['))) { // eslint-disable-line
      if (next.text === '[') {
        primary = {
          type: AST.MemberExpression,
          object: primary,
          property: this.primary(),
          computed: true,
        }
        this.consume(']')
      } else {
        primary = {
          type: AST.MemberExpression,
          object: primary,
          property: this.identifier(),
          computed: false,
        }
      }
    }
    return primary
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

  peek(e1, e2, e3, e4) {
    if (this.tokens.length > 0) {
      const text = this.tokens[0].text
      if (text === e1 || text === e2 || text === e3 || text === e4 ||
        (!e1 && !e2 && !e3 && !e4)) {
        return this.tokens[0]
      }
    }
    return null
  }

  expect(e1, e2, e3, e4) {
    const token = this.peek(e1, e2, e3, e4)
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
    this.state = { body: [], nextId: 0, vars: [] }
    this.recurse(ast)
    return new Function('s', 'l', `${this.state.vars.length ? // eslint-disable-line
      `var ${this.state.vars.join(',')};` : ''}${this.state.body.join('')}`)
  }

  recurse(ast) {
    let elements
    let properties
    let intoId
    let left
    switch (ast.type) {
      case AST.Program:
        this.state.body.push('return ', this.recurse(ast.body), ';')
        return null
      case AST.Literal:
        return AstCompiler.escape(ast.value)
      case AST.Identifier:
        intoId = this.nextId()
        this.if_(this.getHasOwnProperty('l', ast.name),
          this.assign(intoId, this.nonComputedMember('l', ast.name)))
        this.if_(`${this.not(this.getHasOwnProperty('l', ast.name))} && s`,
          this.assign(intoId, this.nonComputedMember('s', ast.name)))
        return intoId
      case AST.ThisExpression:
        return 's'
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
      case AST.MemberExpression:
        intoId = this.nextId()
        left = this.recurse(ast.object)
        if (ast.computed) {
          const right = this.recurse(ast.property)
          this.if_(left, this.assign(intoId, this.computedMember(left, right)))
        } else {
          this.if_(left, this.assign(intoId, this.nonComputedMember(left, ast.property.name)))
        }
        return intoId
      default:
        return null
    }
  }

  if_(test, consequent) {
    this.state.body.push(`if(${test}){${consequent}}`)
  }

  not(e) {
    return `!(${e})`
  }

  getHasOwnProperty(obj, prop) {
    return `${obj} && (${AstCompiler.escape(prop)} in ${obj})`
  }

  nonComputedMember(left, right) {
    return `(${left}).${right}`
  }

  computedMember(left, right) {
    return `(${left})[${right}]`
  }

  assign(id, value) {
    return `${id}=${value}`
  }

  nextId() {
    const id = `v${this.state.nextId}`
    this.state.nextId += 1
    this.state.vars.push(id)
    return id
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
