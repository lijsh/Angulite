import _ from 'lodash'

function initWatchVal() {}

module.exports = class Scope {
  constructor() {
    this.$$watchers = []
  }
  $watch(watchFn, listenerFn) {
    const watcher = {
      watchFn,
      listenerFn: listenerFn || function () {},
      last: initWatchVal,
    }
    this.$$watchers.push(watcher)
  }
  $digest() {
    let newValue
    let oldValue
    _.forEach(this.$$watchers, watcher => {
      newValue = watcher.watchFn(this)
      oldValue = watcher.last
      if (newValue !== oldValue) {
        watcher.last = newValue
        watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), this)
      }
    })
  }
}