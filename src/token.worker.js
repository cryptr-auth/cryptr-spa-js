self.addEventListener('install', function (_event) {
  console.log('listener install')
  // Perform some task
})

self.addEventListener('activate', function (_event) {
  console.log('listener activate')
  // Perform some task
})

self.addEventListener('message', (event) => {
  console.log('addEventListener triggered')
  let data = event.data
  let { refreshTokenParameters } = data
  const WAIT_SECONDS = 10

  setTimeout(() => {
    self.postMessage('rotate')
  }, WAIT_SECONDS * 1000)
})
