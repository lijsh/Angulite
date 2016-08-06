import _ from 'lodash'

module.exports = class Scope {
  constructor() {
    this.$$watchers = []
  }
  $watch(watchFn, listenerFn) {
    const watcher = { watchFn, listenerFn }
    this.$$watchers.push(watcher)
  }
  $digest() {
    _.forEach(this.$$watchers, watcher => {
      watcher.watchFn(this)
      watcher.listenerFn()
    })
  }
}