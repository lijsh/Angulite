import parse from '../src/parse'

describe('parse', () => {
  describe('parse literal', () => {
    it('can parse an integer', () => {
      const fn = parse('42')
      expect(fn).toBeDefined()
      expect(fn()).toBe(42)
    })

    it('can parse a floating point number', () => {
      const fn = parse('4.2')
      expect(fn()).toBe(4.2)
    })

    it('can parse a floating point number without an integer part', () => {
      const fn = parse('.42')
      expect(fn()).toBe(0.42)
    })

    it('can parse a number in  scientific notation', () => {
      const fn = parse('42e3')
      expect(fn()).toBe(42000)
    })

    it('can parse scientific notation with a float coefficient', () => {
      const fn = parse('.42e2')
      expect(fn()).toBe(42)
    })

    it('can parse scientific notation with negative exponents', () => {
      const fn = parse('4200e-2')
      expect(fn()).toBe(42)
    })

    it('can parse scientific notation with the + sign', () => {
      const fn = parse('.42e+2')
      expect(fn()).toBe(42)
    })

    it('can parse upper case scientific notation', () => {
      const fn = parse('.42E2')
      expect(fn()).toBe(42)
    })

    it('will not parse invalid scientific notation', () => {
      expect(() => { parse('42e-') }).toThrow()
      expect(() => { parse('42e-a') }).toThrow()
    })

    // parse String
    it('can parse a string in single quotes', () => {
      const fn = parse("'abc'") // eslint-disable-line
      expect(fn()).toBe('abc')
    })

    it('can parse a string in double quotes', () => {
      const fn = parse('"abc"')
      expect(fn()).toBe('abc')
    })

    it('will not parse a string with mismatching quotes', () => {
      expect(() => { parse('"abc\'') }).toThrow()
    })

    it('can parse a string with single quotes inside', () => {
      const fn = parse("'a\\\'b'") // eslint-disable-line
      expect(fn()).toBe('a\'b')
    })

    it('can parse a string with double quotes inside', () => {
      const fn = parse('"a\\\"b"') // eslint-disable-line
      expect(fn()).toBe('a\"b') // eslint-disable-line
    })

    it('will parse a string with unicode escapes', () => {
      const fn = parse('"\\u00A0"')
      expect(fn()).toBe('\u00A0')
    })

    it('will not parse a string with invalid unicode escapes', () => {
      expect(() => { parse('"\\u00T0"') }).toThrow()
    })

    it('will parse null', () => {
      const fn = parse('null')
      expect(fn()).toBe(null)
    })

    it('will parse true', () => {
      const fn = parse('true')
      expect(fn()).toBe(true)
    })

    it('will parse false', () => {
      const fn = parse('false')
      expect(fn()).toBe(false)
    })

    it('ignore all spaces', () => {
      const fn = parse(' \n42  ')
      expect(fn()).toBe(42)
    })

    it('will parse an empty array', () => {
      const fn = parse('[]')
      expect(fn()).toEqual([])
    })

    it('will parse a non-empty array', () => {
      const fn = parse('[1, "two", [3], true]')
      expect(fn()).toEqual([1, 'two', [3], true])
    })

    it('will parse array with trailing comma', () => {
      const fn = parse('[1, 2, 3,]')
      expect(fn()).toEqual([1, 2, 3])
    })

    it('will parse an empty object', () => {
      const fn = parse('{}')
      expect(fn()).toEqual({})
    })

    it('will parse a non-empty object', () => {
      const fn = parse('{ "a key": 1, \'another key\': 2 }')
      expect(fn()).toEqual({ 'a key': 1, 'another key': 2 })
    })

    it('will parse an object with identifier keys', () => {
      const fn = parse('{a: 1, b: [2, 3], c: {d: 4}}')
      expect(fn()).toEqual({ a: 1, b: [2, 3], c: { d: 4 } })
    })

    it('will parse an object with trailing comma', () => {
      const fn = parse('{a: 1, b: [2, 3], c: {d: 4},}')
      expect(fn()).toEqual({ a: 1, b: [2, 3], c: { d: 4 } })
    })
  })

  describe('look up and function call expressions', () => {
    it('looks up an attribute from the scope', () => {
      const fn = parse('aKey')
      expect(fn({ aKey: 42 })).toBe(42)
      expect(fn({ })).toBeUndefined()
    })

    it('will parse this', () => {
      const fn = parse('this')
      const scope = {}
      expect(fn(scope)).toBe(scope)
      expect(fn()).toBeUndefined()
    })

    it('looks up a 2-part identifiers path from the scope', () => {
      const fn = parse('aKey.anotherKey')
      expect(fn({ aKey: { anotherKey: 42 } })).toBe(42)
      expect(fn({ aKey: {} })).toBeUndefined()
      expect(fn({ })).toBeUndefined()
    })

    it('looks up a member from an object', () => {
      const fn = parse('{aKey: 42}.aKey')
      expect(fn()).toBe(42)
    })

    it('looks up a 4-part identifiers path from the scope', () => {
      const fn = parse('aKey.secondKey.thirdKey.fourthKey')
      expect(fn({ aKey: { secondKey: { thirdKey: { fourthKey: 42 } } } })).toBe(42)
      expect(fn({ aKey: { secondKey: { thirdKey: { } } } })).toBeUndefined()
      expect(fn({ aKey: { } })).toBeUndefined()
      expect(fn({})).toBeUndefined()
    })

    it('use locals instead of scope when there is a matching key', () => {
      const fn = parse('aKey')
      const scope = { aKey: 42 }
      const locals = { aKey: 43 }
      expect(fn(scope, locals)).toBe(43)
    })

    it('does not use locals when no matching key', () => {
      const fn = parse('aKey')
      const scope = { aKey: 42 }
      const locals = { otherKey: 43 }
      expect(fn(scope, locals)).toBe(42)
    })

    it('use locals instead of scope when the first part matches', () => {
      const fn = parse('aKey.anotherKey')
      const scope = { aKey: { anotherKey: 42 } }
      const locals = { aKey: {} }
      expect(fn(scope, locals)).toBeUndefined()
    })

    it('parses a simple computed property access', () => {
      const fn = parse('aKey["anotherKey"]')
      expect(fn({ aKey: { anotherKey: 42 } })).toBe(42)
    })

    it('parses a computed numeric array access', () => {
      const fn = parse('anArray[1]')
      expect(fn({ anArray: [1, 2, 3] })).toBe(2)
    })

    it('parses a computed access with another key as property', () => {
      const fn = parse('lock[key]')
      expect(fn({ key: 'theKey', lock: { theKey: 42 } })).toBe(42)
    })

    it('parses computed access with another access as property', () => {
      const fn = parse('lock[keys["aKey"]]')
      expect(fn({ keys: { aKey: 'theKey' }, lock: { theKey: 42 } })).toBe(42)
    })
  })
})
