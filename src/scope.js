import _ from 'lodash'

function initWatchVal() {}

module.exports = class Scope {
  constructor() {
    this.$$watchers = []
    this.$$lastDirtyWatch = null
  }
  $watch(watchFn, listenerFn) {
    const watcher = {
      watchFn,
      listenerFn: listenerFn || function () {},
      last: initWatchVal,
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
      if (newValue !== oldValue) {
        this.$$lastDirtyWatch = watcher
        watcher.last = newValue
        watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), this)
        dirty = true
      } else if (this.$$lastDirtyWatch === watcher) {
        return false
      }
    })
    return dirty
  }
}