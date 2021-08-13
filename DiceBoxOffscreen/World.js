import { createCanvas } from './components/canvas'
import worldWorker from './components/world.offscreen?worker'
import diceWorker from './components/physics.worker?worker'
import { debounce } from './helpers'

let canvas, physicsWorker, physicsWorkerInit, offscreen, offscreenWorker, offscreenWorkerInit, delay
let rollData = {}, rollId = 0

const defaultOptions = {
  enableDebugging: false,
  enableShadows: true,
  delay: 10,
	gravity: 4,
	startPosition: [0,12,0],
	spinForce: 20,
	throwForce: 20,
	zoomLevel: 4, // 0-7, can we round it out to 9? And reverse it because higher zoom means closer
	theme: 'nebula'
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
		const resizeWorkers = () => {
      offscreenWorker.postMessage({action: "resize", width: canvas.clientWidth, height:canvas.clientHeight});
      physicsWorker.postMessage({action: "resize", width: canvas.clientWidth, height:canvas.clientHeight});
		}
		const debounceResize = debounce(resizeWorkers)
    window.addEventListener("resize", debounceResize)

		this.onDieComplete = () => {}
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
				this.onDieComplete(die) // TODO: die should have 'sides' or is that unnecessary data passed between workers?
			}
			if(e.data.action === 'roll-complete') {

				// calculate the value of all the rolls added together - not so useful for advanced rolls such as 4d6dl1 (4d6 drop lowest 1)
				rollData.forEach(rollGroup => {
					rollGroup.value = Object.values(rollGroup.rolls).reduce((val,roll) => val + roll.result,0)
				})

				this.onRollComplete(rollData)
			}
    }

    // initialize the ammojs physics worker
    physicsWorker.postMessage({
      action: "init",
      width: canvas.clientWidth,
      height:canvas.clientHeight,
			options: this.config
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

	// this will add a notation to the current roll
	// if string then added as a new group
	// if object then can be added via groupId {groupId, sides, qty}
  add(options) {
    // console.log("add die from main")
		if (!options.groupId){
			options.groupId = 0
		}
		if(!options.rollId) {
			options.rollId = rollId++
		}
		
		rollData[options.groupId].rolls[options.rollId] = {
			...options
		}
    offscreenWorker.postMessage({
      action: "addDie",
      options
    })
  }

	// this will re-roll the last notation pased in
	reroll(notation) {
		this.add({
			...notation,
			sides: notation.sides
		})
	}

	// only accepts simple notations such as 2d20
	// for rolling groups of dice
	// accepts simple notations eg: 4d6
	// accepts array of objects as [{sides:int, qty:int, groupId:int, mods:[]}]
  roll(notation) {
    // reset the offscreen worker and physics worker with each new roll
    this.clear()
		// console.log(`notation`, notation)

		const rollSet = (roll) => {
			// rolling a set of dice such as 4d20
			// create an object to store this roll with a unique id
			// { id: UUID, notation: '4d20', rolls: []}
			// console.log(`roll`, roll)
			console.log(`rollData`, rollData)
			rollData[roll.groupId].rolls = {}
			for (var i = 0, len = roll.qty; i < len; i++) {
				//TODO: do not pipe this though this.add. That is going to be for a different api
				this.add({sides: roll.sides, groupId: roll.groupId})
			}
		}

		if(typeof notation === 'string') {
			let parsedNotation = this.parse(notation)
			let group = rollData.length
			rollData[group] = parsedNotation
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

	hide() {
		canvas.style.display = 'none'
	}

	show() {
		canvas.style.display = 'block'
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
      sides : roll[2],
      modifier : mod
    }
  }
}

export default World