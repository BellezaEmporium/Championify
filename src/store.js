import Store from 'electron-store'

const store = new Store()

export default {
  get: (key) => store.get(key),
  set: (key, value) => store.set(key, value),
  push: (key, value) => {
    const array = store.get(key) || []
    array.push(value)
    store.set(key, array)
  },
  remove: (key) => store.delete(key)
}
