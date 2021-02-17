// import InMemory from './memory'

self.addEventListener('install', function (_event) {
  console.log('listener install')
  // Perform some task
})

self.addEventListener('activate', function (_event) {
  console.log('listener activate')
  // Perform some task
})

// self.addEventListener('message', (event) => {
//   let data = event.data
//   let { rotation_duration, expiration_date } = data
//   console.log('tryToRefreshDateStart :')

//   if (new Date().getTime() <= expiration_date) {
//     recurringRefreshToken(rotation_duration)
//   } else {
//     console.error('refresh is no more valid')
//   }
// })

// function recurringRefreshToken(rotation_duration) {
//   setTimeout(() => {
//     self.postMessage('rotate')
//   }, rotation_duration)
// }

self.addEventListener('message', (event) => {
  let data = event.data
  let { refreshTokenParameters } = data
  console.log('worker triggered')
  const WAIT_SECONDS = 10

  setTimeout(() => {
    self.postMessage('rotate')
  }, WAIT_SECONDS * 1000)
})

// @thib brainstorming
// function wait(refreshTokenParameters) {
//   let tryToRefreshDateStart = new Date(refreshTokenParameters.access_token_expiration_date)

//   const leeway = refresh_leeway || DEFAULT_LEEWAY_IN_SECONDS
//   const retry = refresh_retry || DEFAULT_REFRESH_RETRY

//   let now = (new Date()).getTime() / 1000;

//   // tryToRefreshDateStart with
//   const deadlineInSeconds = tryToRefreshDateStart.setSeconds(tryToRefreshDateStart.getSeconds() - leeway * retry).getTime() / 1000

//   const waitTriggerInSeconds = deadlineInSeconds - now

//   return waitTriggerInSeconds
// }
