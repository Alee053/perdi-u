import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { browserEffects } from '../src/infrastructure/browser/browser-effects.js'

test('la limpieza de una URL notifica la ruta actual y libera su suscripción', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const events = new EventTarget()
  const location = { pathname: '/', search: '?q=camara&error=private-sentinel' }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
    },
  })
  try {
    const paths: string[] = []
    const stop = browserEffects.onPathChange((path) => paths.push(path))
    location.search = '?q=camara'
    browserEffects.notifyPathChange()
    assert.deepEqual(paths, ['/?q=camara'], 'la búsqueda recibe la URL ya limpia')
    stop()
    location.search = ''
    browserEffects.notifyPathChange()
    assert.equal(paths.length, 1)
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
