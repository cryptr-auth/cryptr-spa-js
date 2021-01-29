// import InMemory from './memory'

self.addEventListener('install', function (_event) {
  // Perform some task
})

self.addEventListener('activate', function (_event) {
  // Perform some task
})

self.addEventListener('message', (event) => {
  let data = event.data
  let { rotation_duration, expiration_date } = data
  if (new Date().getTime() <= expiration_date) {
    refreshPeriodically(rotation_duration)
  } else {
    console.error('refresh is no more valid')
  }
})

function refreshPeriodically(rotation_duration) {
  setTimeout(() => {
    self.postMessage('rotate')
  }, rotation_duration)
}
