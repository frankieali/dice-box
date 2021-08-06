import { createCanvas } from './components/canvas'
import worldWorker from './WorldOffscreen?worker'
import diceWorker from './components/Dice/physics.worker?worker'

let canvas, physicsWorker, physicsWorkerInit, offscreen, offscreenWorker, offscreenWorkerInit, delay
let rollData = {}, rollId = 0

const defaultOptions = {
  enableDebugging: false,
  enableShadows: true,
  delay: 10
}

class World {
  constructor(container, options = {}){
    canvas = createCanvas({
      selector: container,
      id: 'dice-canvas'
    })
    this.config = {...defaultOptions, ...options}

    offscreen = canvas.transferControlToOffscreen()
    offscreenWorker = new worldWorker()
    // need to initialize the web worker and get confirmation that initialization is complete before other scripts can run
    // set a property on the worker to a promise that is resolve when the proper message is returned from the worker
    offscreenWorker.init = new Promise((resolve, reject) => {
      offscreenWorkerInit = resolve
    })

    physicsWorker = new diceWorker()
    physicsWorker.init = new Promise((resolve, reject) => {
      physicsWorkerInit = resolve
    })

    // create message channels for the two web workers to communicate through
    const channel = new MessageChannel()
    // Setup the connection: Port 1 is for offscreenWorker
    offscreenWorker.postMessage({
      action : "connect",
    },[ channel.port1 ])

    // Setup the connection: Port 2 is for physicsWorker
    physicsWorker.postMessage({
      action : "connect",
    },[ channel.port2 ])

    // send resize events to listeners
    window.addEventListener("resize", () => {
      offscreenWorker.postMessage({action: "resize", width: canvas.clientWidth, height:canvas.clientHeight});
      physicsWorker.postMessage({action: "resize", width: canvas.clientWidth, height:canvas.clientHeight});
    })

		this.onRollComplete = () => {}
  }

  async initScene(options = {}) {
    // initalize the offscreen worker
    offscreenWorker.postMessage({
      action: "init",
      canvas: offscreen,
      width: canvas.clientWidth,
      height:canvas.clientHeight,
      config: {...this.config, options}
    }, [offscreen])

    offscreenWorker.onmessage = (e) => {
      // case: "init-complete" => fulfill promise so other things can run
      if(e.data.action === "init-complete") {
        // console.log("received worldOffscreenWorker message: init-complete")
        offscreenWorkerInit()
      }
			if(e.data.action === 'roll-result') {
				const die = e.data.die
				// map die results back to our rollData
				rollData[die.groupId].rolls[die.rollId].result = die.result
			}
			if(e.data.action === 'roll-complete') {
				console.log(`rollData`, rollData)
				this.onRollComplete(rollData)
			}
    }

    // initialize the ammojs physics worker
    physicsWorker.postMessage({
      action: "init",
      width: canvas.clientWidth,
      height:canvas.clientHeight
    })

    physicsWorker.onmessage = (e) => {
      // case: "init-complete" => fulfill promise so other things can run
      if(e.data.action === "init-complete") {
        // console.log("received physicsWorker message: init-complete")
        physicsWorkerInit()
      }
    }

    // pomise.all to initialize both offscreenWorker and physicsWorker
    await Promise.all([offscreenWorker.init, physicsWorker.init])

  }

  add(options) {
    // console.log("add die from main")
		if (!options.groupId){
			options.groupId = 0
		}
		if(!options.rollId) {
			options.rollId = rollId++
		}
		
		rollData[options.groupId].rolls[options.rollId] = {
			groupId: options.groupId,
			type: options.dieType,
		}
    offscreenWorker.postMessage({
      action: "addDie",
      options
    })
  }

	reroll(notation) {
		this.add({
			...notation,
			dieType: notation.type
		})
	}

	// only accepts simple notations such as 2d20
  roll(notation) {
    // reset the offscreen worker and physics worker with each new roll
    this.clear()
		// console.log(`notation`, notation)

		const rollSet = (roll) => {
			// rolling a set of dice such as 4d20
			// create an object to store this roll with a unique id
			// { id: UUID, notation: '4d20', rolls: []}
			console.log(`roll`, roll)
			console.log(`rollData`, rollData)
			rollData[roll.groupId].rolls = {}
			for (var i = 0, len = roll.number; i < len; i++) {
				this.add({dieType: roll.type, groupId: roll.groupId})
			}
		}

		if(typeof notation === 'string') {
			let parsedNotation = this.parse(notation)
			rollData = parsedNotation
			rollSet(parsedNotation)
		}

		// if(notation.constructor === Object) {
		// 	rollData.push(roll)
		// 	rollSet(roll)
		// }

		// TODO: using .push will create object reference and mutate original notation values. Good thing?
		if(Array.isArray(notation)) {
			// rolling each group
			notation.forEach(roll => {
				if(typeof roll === 'string') {
					let parsedNotation = this.parse(roll)
					rollData.push(parsedNotation)
					rollSet(parsedNotation)
				}
				else {
					// console.log(`roll`, roll)
					rollData.push(roll)
					rollSet(roll)
				}
			})
		}

  }

  clear() {
		// reset the rollId and rollData
		rollId = 0
		rollData = []
    // clear all physics die bodies
    physicsWorker.postMessage({action: "clearDice"})
    // clear all rendered die bodies
    offscreenWorker.postMessage({action: "clearDice"})
  }

  // parse text die notation such as 2d10+3 => {number:2, type:6, modifier:3}
  // TODO: more notation support in the future such as 2d6 + 2d6
  // taken from https://github.com/ChapelR/dice-notation
  parse(notation) {
    const diceNotation = /(\d+)[dD](\d+)(.*)$/i
    const modifier = /([+-])(\d+)/
    const cleanNotation = notation.trim().replace(/\s+/g, '')
    const validNumber = (n, err) => {
      n = Number(n)
      if (Number.isNaN(n) || !Number.isInteger(n) || n < 1) {
        throw new Error(err);
      }
      return n
    }

    const roll = cleanNotation.match(diceNotation);
		let mod = 0;
    const msg = 'Invalid notation: ' + notation + '';

    if (roll.length < 3) {
      throw new Error(msg);
    }
    if (roll[3] && modifier.test(roll[3])) {
      const modParts = roll[3].match(modifier);
      let basicMod = validNumber(modParts[2], msg);
      if (modParts[1].trim() === '-') {
        basicMod *= -1;
      }
      mod = basicMod;
    }
    
    roll[1] = validNumber(roll[1], msg);
    roll[2] = validNumber(roll[2], msg);
    return {
      number : roll[1],
      type : `d${roll[2]}`,
      modifier : mod
    }
  }
}

export default World