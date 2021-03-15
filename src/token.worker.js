addEventListener('message', (event) => {
  console.log('addEventListener triggered')
  let data = event.data
  let { refreshTokenParameters } = data
  const WAIT_SECONDS = 10

  setTimeout(() => {
    self.postMessage('rotate')
  }, WAIT_SECONDS * 1000)
})
