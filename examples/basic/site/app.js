const form = document.querySelector('#brief-form')
const button = document.querySelector('#generate')
const processTitle = document.querySelector('#process-title')
const processCopy = document.querySelector('#process-copy')
const processCard = document.querySelector('.process-card')
const resultPanel = document.querySelector('#result-panel')
const copyButton = document.querySelector('#copy')
const copyStatus = document.querySelector('#copy-status')

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  button.disabled = true
  button.querySelector('span').textContent = 'Shaping direction'
  processCard.classList.add('working')
  processTitle.textContent = 'Reading the signal'
  processCopy.textContent = 'Finding the useful tension between ambition, audience, and format.'

  await pause(1500)
  processTitle.textContent = 'Finding the human edge'
  processCopy.textContent = 'Turning broad intent into one memorable point of view.'
  await pause(1400)

  processCard.classList.remove('working')
  processCard.classList.add('complete')
  processTitle.textContent = 'Direction ready'
  processCopy.textContent = 'One focused angle, grounded in the audience you described.'
  resultPanel.classList.add('revealed')
  button.querySelector('span').textContent = 'Brief shaped'
  document.querySelector('#proof').classList.add('ready')
})

copyButton.addEventListener('click', async () => {
  copyButton.textContent = 'Copied'
  copyButton.classList.add('copied')
  copyStatus.textContent = 'Direction copied'
})
