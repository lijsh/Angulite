/* eslint-disable */
import _ from 'lodash'
import Scope from '../src/scope.js'

describe('Scope', () => {
  it('can be constructed and used as an object', () => {
    const $scope = new Scope()
    $scope.aProperty = 1

    expect($scope.aProperty).toBe(1)
  })

  describe('digest', () => {
    let $scope
    beforeEach(() => {
      $scope = new Scope()
    })

    it('calls the listener function of a watch on first $digest', () => {
      const watchFn = () => 'wat'
      const listenerFn = jasmine.createSpy()
      $scope.$watch(watchFn, listenerFn)

      $scope.$digest()
      expect(listenerFn).toHaveBeenCalled()
    })

    it('calls the watch function with the scope as the argument', () => {
      const watchFn = jasmine.createSpy()
      const listenerFn = () => {}
      $scope.$watch(watchFn, listenerFn)

      $scope.$digest()

      expect(watchFn).toHaveBeenCalledWith($scope)
    })

    it('calls the listener function when the watched value changes', () => {
      $scope.someValue = 'a'
      $scope.counter = 0
      $scope.$watch(scope => scope.someValue, (newValue, oldValue, scope) => {
        scope.counter++
      })

      expect($scope.counter).toBe(0)

      $scope.$digest()
      expect($scope.counter).toBe(1)

      $scope.$digest()
      expect($scope.counter).toBe(1)

      $scope.someValue = 'b'
      expect($scope.counter).toBe(1)

      $scope.$digest()
      expect($scope.counter).toBe(2)
    })

    it('calls listener when watch value is first undefined', () => {
      $scope.counter = 0

      $scope.$watch(scope => scope.someValue, (newValue, oldValue, scope) => {
        scope.counter++
      })

      $scope.$digest()
      expect($scope.counter).toBe(1)
    })

    it('calls listener with new value as old value the first time', () => {
      $scope.someValue = 123
      let oldValueGiven

      $scope.$watch(scope => scope.someValue, (newValue, oldValue) => {
        oldValueGiven = oldValue
      })

      $scope.$digest()
      expect(oldValueGiven).toBe(123)
    })

    it('may have watchers that omit the listener function', () => {
      const watchFn = jasmine.createSpy().and.returnValue('something')
      $scope.$watch(watchFn)

      $scope.$digest()
      expect(watchFn).toHaveBeenCalled()
    })

    it('triggers chained watchers in the same digest', () => {
      $scope.name = 'Jane'

      $scope.$watch(scope => scope.nameUpper, (newValue, oldValue, scope) => {
        if (newValue) {
          scope.initial = `${newValue.substring(0, 1)}.`
        }
      })

      $scope.$watch(scope => scope.name, (newValue, oldValue, scope) => {
        if (newValue) {
          scope.nameUpper = newValue.toUpperCase()
        }
      })

      $scope.$digest()
      expect($scope.initial).toBe('J.')

      $scope.name = 'Bob'
      $scope.$digest()
      expect($scope.initial).toBe('B.')
    })

    it('gives up on the watches after 10 iterations', () => {
      $scope.counterA = 0
      $scope.counterB = 0

      $scope.$watch(scope => scope.counterA, (newValue, oldValue, scope) => {
        scope.counterB++
      })

      $scope.$watch(scope => scope.counterB, (newValue, oldValue, scope) => {
        scope.counterA++
      })

      expect((() => { $scope.$digest() })).toThrow()
    })

    it('ends the digest when the last watch is clean', () => {
      $scope.array = _.range(100)
      let watchExecutions = 0

      _.times(100, i => {
        $scope.$watch(scope => {
          watchExecutions++
          return scope.array[i]
        })
      })

      $scope.$digest()
      expect(watchExecutions).toBe(200)

      $scope.array[0] = 420
      $scope.$digest()
      expect(watchExecutions).toBe(301)
    })

    it('does not end digest so that new watches are not run', () => {
      $scope.aValue = 'abc'
      $scope.counter = 0

      $scope.$watch(scope => scope.aValue, (newValue, oldValue, scope) => {
        scope.$watch(scope => scope.aValue, (newValue, oldValue, scope) => {
          scope.counter++
        })
      })
      $scope.$digest()
      expect($scope.counter).toBe(1)
    })

    it('compares based on value if enabled', () => {
      $scope.aValue = [1, 2, 3]
      $scope.counter = 0

      $scope.$watch(scope => scope.aValue, (newValue, oldValue, scope) => {
        scope.counter++
      }, true)

      $scope.$digest()
      expect($scope.counter).toBe(1)

      $scope.aValue.push(4)
      $scope.$digest()
      expect($scope.counter).toBe(2)
    })

    it('correctly handles NaNs', () => {
      $scope.number = 0 / 0
      $scope.counter = 0

      $scope.$watch(scope => scope.number, (newValue, oldValue, scope) => {
        scope.counter++
      })

      $scope.$digest()
      expect($scope.counter).toBe(1)

      $scope.$digest()
      expect($scope.counter).toBe(1)
    })
  })
})