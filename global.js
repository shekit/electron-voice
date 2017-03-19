const record = require('node-record-lpcm16')
const path = require('path')
const events = require('events')
const os = require('os')

// EVENT EMITTER
var eventEmitter = new events.EventEmitter()
eventEmitter.setMaxListeners(Infinity)

eventEmitter.on('final', function(data){
	console.log("FINAL TEXT RESULT:",data)
})


// SNOWBOY
const Detector = require('snowboy').Detector;
const Models = require('snowboy').Models;

const models = new Models();

models.add({
	file: path.resolve('./Peeqo.pmdl'),
	sensitivity: 0.5,
	hotwords: 'peeqo'
})

const snowboyDetector = new Detector({
	resource: "./common.res",
	models: models,
	audioGain: 2.0
})

// NODE RECORD

var recorder = (os.arch()=='arm')?'arecord':'rec'

const opts = {
	verbose: false,
	threshold: 0,
	recordProgram: recorder
}

const mic = record.start(opts)


// GOOGLE CLOUD SPEECH
const speech = require('@google-cloud/speech')({
  projectId: 'peeqo-161506',
  keyFilename: path.resolve('./keyfile.json')
})

const request = {
	config:{
		encoding: "LINEAR16",
		sampleRate: 16000,
		languageCode: 'en-US'
	},
	singleUtterance: true,
    interimResults: true
}


// SPEECH CLASS
class GoogleSpeech {
	constructor(request){
		this.request = request
		this.stream = speech.createRecognizeStream(request)
		this.result = ''
	}

	unpipeStream(stream){
		mic.unpipe(stream)
	}

	endStream(stream){
		stream.end()
	}

	startStream(){

		var self = this

		this.stream.on('pipe', function(){
			console.log('PIPING > GOOGLE')
		})

		this.stream.on('error', function(err){
			console.error('ERROR > GOOGLE', err)
		})

		this.stream.on('close', function(){
			console.log('GOOGLE PIPE > CLOSED')
		})

		this.stream.on('data', function(data){

			var result = data.results[0]

			//console.log(data)

			if(data.endpointerType === 'END_OF_UTTERANCE'){
				console.log("GOOGLE END OF UTTERANCE")
				mic.unpipe(self.stream)
			}

			if(data.endpointerType === 'ENDPOINTER_EVENT_UNSPECIFIED'){
				//console.log(data)
				self.result = data.results
				//console.log(main.result)
				// if(result && !result.isFinal){
				// 	console.log("!p:", result)
				// } else if(result && result.isFinal){
				// 	console.log("!F:", result)
				// }
			}

			if(data.error){
				console.error("GOOGLE DATA ERROR", data.error)
			}

			if(data.endpointerType === 'START_OF_SPEECH'){
				console.log("GOOGLE DETECTED SPEECH")
			}

			if(data.endpointerType === 'END_OF_SPEECH'){
				console.log("GOOGLE END OF SPEECH")
			}

			if(data.endpointerType === 'END_OF_AUDIO'){
				console.log("GOOGLE END OF AUDIO")
			}
		})

		this.stream.on('unpipe', function(){
			console.log('UNPIPING > GOOGLE')
			self.stream.end()
		})

		this.stream.on('finish', function(){
			console.log('FINISHED > GOOGLE')
			eventEmitter.emit("final",self.result)
			mic.pipe(snowboyDetector)
		})

		mic.pipe(this.stream)
	}

}

// SNOWBOY EVENTS
snowboyDetector.on('unpipe', function(src){
	console.log('STOPPED PIPING > SNOWBOY')
})

snowboyDetector.on('pipe', function(src){
	console.log('PIPING > SNOWBOY')
})

snowboyDetector.on('error', function(err){
	console.error("SNOWBOY ERROR:",err)
})

snowboyDetector.on('close', function(){
	console.log("SNOWBOY PIPE CLOSED")
})

snowboyDetector.on('hotword', function(index, hotword){
	console.log('HOTWORD', index, hotword)
	mic.unpipe(snowboyDetector)
	const gNew = new GoogleSpeech(request)
	gNew.startStream()
})

snowboyDetector.on('data', function(data){
	console.log("SNOWBOY DATA", data)
})



// START LISTENING

mic.pipe(snowboyDetector)








