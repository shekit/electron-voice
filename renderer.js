// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const Sonus = require('sonus')
const path = require('path')
const speech = require('@google-cloud/speech')({
  projectId: 'streaming-speech-sample',
  keyFilename: path.resolve('./keyfile.json')
})

const hotwords = [{ file: path.resolve('node_modules/sonus/resources/sonus.pmdl'), hotword: 'sonus' }]
const language = "en-US"

//recordProgram can also be 'arecord' which works much better on the Pi and low power devices
const sonus = Sonus.init({ hotwords, language, recordProgram: "rec" }, speech)

Sonus.start(sonus)
console.log('Say "' + hotwords[0].hotword + '"...')

sonus.on('hotword', (index, keyword) => console.log("!" + keyword))

sonus.on('partial-result', result => console.log("Partial", result))

sonus.on('final-result', result => {
  console.log("Final", result)
  if (result.includes("stop")) {
    Sonus.stop()
  }
})