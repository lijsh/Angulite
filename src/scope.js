import _ from 'lodash'

function initWatchVal() {}

export default class Scope {
    constructor() {
        this.$$watchers = []
        this.$$lastDirtyWatch = null
    }
    $watch(watchFn, listenerFn, valueEq) {
        const watcher = {
            watchFn,
            listenerFn: listenerFn || function () {},
            last: initWatchVal,
            valueEq: !!valueEq,
        }
        this.$$watchers.push(watcher)
        this.$$lastDirtyWatch = null
    }
    $digest() {
        let dirty
        let ttl = 10
        this.$$lastDirtyWatch = null
        do {
            dirty = this.$$digestOnce()
            if (dirty && !(ttl--)) {
                throw new Error('10 digest iteration reached')
            }
        } while (dirty)
    }
    $$digestOnce() {
        let dirty
        let newValue
        let oldValue
        _.forEach(this.$$watchers, watcher => {
            newValue = watcher.watchFn(this)
            oldValue = watcher.last
            if (!this.$$areEqual(newValue, oldValue, watcher.valueEq)) {
                this.$$lastDirtyWatch = watcher
                watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue)
                watcher.listenerFn(newValue,
                    (oldValue === initWatchVal ? newValue : oldValue),
                    this)
                dirty = true
            } else if (this.$$lastDirtyWatch === watcher) {
                return false
            }
        })
        return dirty
    }
    $$areEqual(newValue, oldValue, valueEq) {
        if (valueEq) {
            return _.isEqual(newValue, oldValue)
        }
        return newValue === oldValue ||
            (typeof newValue === 'number' && typeof oldValue === 'number' &&
            isNaN(newValue) && isNaN(oldValue))
    }
}