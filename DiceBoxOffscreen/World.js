import { createCanvas } from './components/canvas'
import worldWorker from './components/world.offscreen?worker'
import diceWorker from './components/physics.worker?worker'
import { debounce } from './helpers'

// private variables
let canvas, physicsWorker, physicsWorkerInit, offscreen, offscreenWorker, offscreenWorkerInit, groupIndex = 0, rollIndex = 0, idIndex = 0

const defaultOptions = {
  enableShadows: true,
  delay: 10,
	gravity: 4, //TODO: high gravity will cause dice piles to jiggle
	startingHeight: 15,
	spinForce: 20,
	throwForce: 2.5,
	zoomLevel: 3, // 0-7, can we round it out to 9? And reverse it because higher zoom means closer
	theme: 'nebula'
}

class World {
  constructor(container, options = {}){
    canvas = createCanvas({
      selector: container,
      id: 'dice-canvas'
    })
    this.config = {...defaultOptions, ...options}
		this.rollData = []
		this.onDieComplete = () => {}
		this.onRollComplete = () => {}

		// transfer controll offscreen
    offscreen = canvas.transferControlToOffscreen()

		// initialize 3D World in which BabylonJS runs
    offscreenWorker = new worldWorker()
    // need to initialize the web worker and get confirmation that initialization is complete before other scripts can run
    // set a property on the worker to a promise that is resolve when the proper message is returned from the worker
    offscreenWorker.init = new Promise((resolve, reject) => {
      offscreenWorkerInit = resolve
    })

		// initialize physics world in which AmmoJS runs
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

    // send resize events to workers - debounced for performance
		const resizeWorkers = () => {
      offscreenWorker.postMessage({action: "resize", width: canvas.clientWidth, height:canvas.clientHeight});
      physicsWorker.postMessage({action: "resize", width: canvas.clientWidth, height:canvas.clientHeight});
		}
		const debounceResize = debounce(resizeWorkers)
    window.addEventListener("resize", debounceResize)
  }

  async initScene(options = {}) {
    // initalize the offscreen worker
    offscreenWorker.postMessage({
      action: "init",
      canvas: offscreen,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      options: {...this.config, ...options}
    }, [offscreen])

		// handle messages from offscreen BabylonJS World
    offscreenWorker.onmessage = (e) => {
			switch( e.data.action ) {
				case "init-complete":
					offscreenWorkerInit() //fulfill promise so other things can run
					break;
				case 'roll-result':
					const die = e.data.die
					// map die results back to our rollData
					this.rollData[die.groupId].rolls[die.rollId].result = die.result
					// we need to add the die id to our entry, or should that be done here?
					// TODO: die should have 'sides' or is that unnecessary data passed between workers?
					this.onDieComplete(die)
					break;
				case 'roll-complete':
					this.onRollComplete(this.getRollResults())
					break;
			}
    }

    // initialize the AmmoJS physics worker
    physicsWorker.postMessage({
      action: "init",
      width: canvas.clientWidth,
      height: canvas.clientHeight,
			options: this.config
    })

    physicsWorker.onmessage = (e) => {
			switch( e.data.action ) {
				case "init-complete":
					physicsWorkerInit() // fulfill promise so other things can run
			}
    }

    // pomise.all to initialize both offscreenWorker and physicsWorker
    await Promise.all([offscreenWorker.init, physicsWorker.init])

  }

	clear() {
		// reset indexes and rollData
		rollIndex = 0
		groupIndex = 0
		this.rollData = []
    // clear all rendered die bodies
    offscreenWorker.postMessage({action: "clearDice"})
    // clear all physics die bodies
    physicsWorker.postMessage({action: "clearDice"})
		return this
  }

	hide() {
		canvas.style.display = 'none'
		return this
	}

	show() {
		canvas.style.display = 'block'
		return this
	}

	// add a die to another group. groupId is required
  add(notation, groupId, theme) {
		if(typeof groupId === 'string' || theme) {
			this.config.theme = theme
		}
		let parsedNotation = this.createNotationArray(notation)
		this.makeRoll(parsedNotation, groupId)
		return this
  }

	reroll(die) {
		// TODO: add hide if you want to keep the die result for an external parser
		// TODO: reroll group
		// TODO: reroll array
		this.remove(die)
		die.qty = 1
		this.add(die, die.groupId)
		return this
	}

	remove(die) {
		const {groupId, rollId, hide = false} = die
		// this will remove a roll from workers and rolldata
		// TODO: hide if you want to keep the die result for an external parser
		// delete the roll from cache
		delete this.rollData[groupId].rolls[rollId]
		// remove the die from the render
		offscreenWorker.postMessage({action: "removeDie", groupId, rollId})
		// remove the die from the physics bodies - we do this in case there's a reroll. Don't want new dice interacting with a hidden physics body
		physicsWorker.postMessage({action: "removeDie", id: rollId})
		return this
	}

  roll(notation, theme) {
		// to add to a roll on screen use .add method
    // reset the offscreen worker and physics worker with each new roll
    this.clear()
		if(theme) {
			this.config.theme = theme
		}
		let parsedNotation = this.createNotationArray(notation)
		this.makeRoll(parsedNotation)
		return this
  }

	makeRoll(parsedNotation, groupId){
		const hasGroupId = groupId !== undefined

		// loop through the number of dice in the group and roll each one
		parsedNotation.forEach(notation => {
			// console.log(`notation`, notation)
			const rolls = {}
			const index = hasGroupId ? groupId : groupIndex
			for (var i = 0, len = notation.qty; i < len; i++) {
				// id's start at zero and zero can be falsy, so we check for undefined
				let rollId = notation.rollId !== undefined ? notation.rollId : rollIndex++
				let id = notation.id !== undefined ? notation.id : idIndex++

				const roll = {
					sides: notation.sides,
					groupId: index,
					rollId,
					id,
					theme: this.config.theme
				}
	
				rolls[rollId] = roll
	
				offscreenWorker.postMessage({
					action: "addDie",
					options: roll
				})
				
			}
	
			if(hasGroupId) {
				Object.assign(this.rollData[groupId].rolls, rolls)
			} else {
				// save this roll group for later
				notation.rolls = rolls
				this.rollData[index] = notation
				++groupIndex
			}
		})
	}

	// accepts simple notations eg: 4d6
	// accepts array of notations eg: ['4d6','2d10']
	// accepts array of objects eg: [{sides:int, qty:int, mods:[]}]
	// accepts object {sides:int, qty:int}
	createNotationArray(notation){
		let parsedNotation = []

		if(typeof notation === 'string') {
			parsedNotation.push(this.parse(notation))
		}

		// notation is an array of strings or objects
		if(Array.isArray(notation)) {
			notation.forEach(roll => {
				// if notation is an array of strings
				if(typeof roll === 'string') {
					parsedNotation.push(this.parse(roll))
				}
				else {
					// TODO: ensure that there is a 'sides' and 'qty' value on the object - required for making a roll
					parsedNotation.push(roll)
				}
			})
		} else if(typeof notation === 'object'){
			// TODO: ensure that there is a 'sides' and 'qty' value on the object - required for making a roll
			parsedNotation.push(notation)
		}

		return parsedNotation
	}

  // parse text die notation such as 2d10+3 => {number:2, type:6, modifier:3}
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
      qty : roll[1],
      sides : roll[2],
      modifier : mod,
    }
  }

	getRollResults(){
		// calculate the value of all the rolls added together - advanced rolls such as 4d6dl1 (4d6 drop lowest 1) will require an external parser

		this.rollData.forEach(rollGroup => {
			// add up the values
			rollGroup.value = Object.values(rollGroup.rolls).reduce((val,roll) => val + roll.result,0)
			// add the modifier
			rollGroup.value += rollGroup.modifier ? rollGroup.modifier : 0
		})
		return this.rollData
	}
}

export default World