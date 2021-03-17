// self.addEventListener('message', (event) => {
//   console.log('addEventListener triggered')
//   let data = event.data
//   let { refreshTokenParameters } = data
//   const WAIT_SECONDS = 10

//   setTimeout(() => {
//     self.postMessage('rotate')
//   }, WAIT_SECONDS * 1000)
// })

onmessage = function (e) {
  console.log('Worker: Message received from main script')
  const result = e.data[0] * e.data[1]
  if (isNaN(result)) {
    postMessage('Please write two numbers')
  } else {
    const workerResult = 'Result: ' + result
    console.log('Worker: Posting message back to main script')
    postMessage(workerResult)
  }
}
