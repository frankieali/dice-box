import { createEngine } from './engine'
import { createScene } from './scene'
import { createCamera } from './camera'
import DiceBox from './DiceBox'
import { createLights } from './lights'
import Dice from './Dice'

let canvas, config, engine, scene, camera, diceBox, lights, physicsWorkerPort, dieCache = [], sleeperCache = [], count = 0, dieRollTimer = []

class WorldOnscreen {
	constructor(options){
		this.initialized = this.initScene(options)
		this.onInitComplete = () => {}
		this.onRollResult = () => {}
		this.onRollComplete = () => {}
	}
	
	// initialize the babylon scene
	async initScene(options) {
		canvas = options.canvas
	
		// set the config from World
		this.config = options.options
		// canvas.width = options.width
		// canvas.height = options.height
	
		engine = createEngine(canvas)
		scene = createScene({engine})
		camera = createCamera({engine, zoomLevel: this.config.zoomLevel})
		lights = createLights({enableShadows: this.config.enableShadows})
	
		// initialize die caches
		// the dieCache order must match the physicsWorker's colliders order so the positioning data matches up
		dieCache = [] // cache dice that are rolling
		sleeperCache = [] // cache dice that have stopped rolling
	
		// create the box that provides surfaces for shadows to render on
		diceBox = new DiceBox({
			...config,
			zoomLevel: this.config.zoomLevel,
			aspect: canvas.width / canvas.height,
			lights,
			scene
		})
		
		// loading all our dice models
		// we use to load these models individually as needed, but it's faster to load them all at once and prevents animation jank when rolling
		await Dice.loadModels(this.config.assetPath)
		
		// start the render engine
		// render()
	
		// init complete - let the world know
		// self.postMessage({action:"init-complete"})
		this.onInitComplete(true)
		return true
	}

	connect(port){
		physicsWorkerPort = port
      physicsWorkerPort.onmessage = (e) => {
        switch (e.data.action) {
          case "updates": // dice status/position updates from physics worker
						this.updatesFromPhysics(e.data)
            break;
        
          default:
            console.error("action from physicsWorker not found in offscreen worker")
            break;
        }
      }
	}

	// all this does is start the render engine.
	render() {
		// document.body.addEventListener('click',()=>engine.stopRenderLoop())
		engine.runRenderLoop(this.renderLoop.bind(this))
		physicsWorkerPort.postMessage({
			action: "resumeSimulation",
		})
	}
	renderLoop() {
		// if no dice awake then stop the render loop and save some CPU power (unless we're in debug mode where we want the arc camera to continue working)
		if(sleeperCache.length !== 0 && dieCache.length === 0) {
			console.log(`no dice moving`)
			engine.stopRenderLoop()
			count = 0
			// stop the physics engine
			physicsWorkerPort.postMessage({
				action: "stopSimulation",
			})
			// post back to the world
			// self.postMessage({
			// 	action: "roll-complete"
			// })
			// TODO: custom event?
			this.onRollComplete()
		}
		// otherwise keep on rendering
		else {
			scene.render()
		}
	}

	clear() {
		if(!dieCache.length && !sleeperCache.length) {
			return
		}
		dieRollTimer.forEach(timer=>clearTimeout(timer))
		// stop anything that's currently rendering
		engine.stopRenderLoop()
		// clear all dice
		dieCache.forEach(die => die.mesh.dispose())
		sleeperCache.forEach(die => die.mesh.dispose())
		Dice.resetCount()
		count = 0
	
		// step the animation forward
		scene.render()
	
		dieCache = []
		sleeperCache = []
	}

	add(options) {
		// space out adding the dice so they don't lump together too much
		dieRollTimer.push(setTimeout(() => {
			this._add(options)
		}, count++ * this.config.delay))
	}

	// add a die to the scene
	async _add(options) {
		if(engine.activeRenderLoops.length === 0) {
			this.render()
		}
		// const themes = ['galaxy','gemstone','glass','iron','nebula','sunrise','sunset','walnut']
		// options.theme = themes[Math.floor(Math.random() * themes.length)]
		// loadDie allows you to specify sides(dieType) and theme and returns the options you passed in
		const newDie = await Dice.loadDie(options).then( response =>  {
			// after the die model and textures have loaded we can add the die to the scene for rendering
		if(!response.lights) {
			response.lights = lights
		}
		if(!response.enableShadows){
			response.enableShadows = this.config.enableShadows
		}
    return new Dice(response)
		})
	
		// save the die just created to the cache
		dieCache.push(newDie)
	
		// tell the physics engine to roll this die type - which is a low poly collider
		physicsWorkerPort.postMessage({
			action: "addDie",
			sides: options.sides,
			id: newDie.id
		})
	
		// for d100's we need to add an additional d10 and pair it up with the d100 just created
		if(options.sides === 100) {
			// assign the new die to a property on the d100 - spread the options in order to pass a matching theme
    newDie.d10Instance = await Dice.loadDie({...options, sides: 10}).then( response =>  {
				const d10Instance = new Dice(response, lights, this.config.enableShadows)
				// identify the parent of this d10 so we can calculate the roll result later
				d10Instance.dieParent = newDie
				return d10Instance
			})
			// add the d10 to the cache and ask the physics worker for a collider
			dieCache.push(newDie.d10Instance)
			physicsWorkerPort.postMessage({
				action: "addDie",
				sides: 10,
				id: newDie.d10Instance.id
			})
		}
	
		// return the die instance
		return newDie
	
	}
	
	remove(data) {
	// remove from sleepercache
	sleeperCache = sleeperCache.filter((die) => {
		let match = die.groupId === data.groupId && die.rollId === data.rollId
		if(match){
			// remove the mesh from the scene
			die.mesh.dispose()
		}
		return !match
	})

	// step the animation forward
	scene.render()
}
	
	updatesFromPhysics(data) {
		// get dice that are sleeping.
		// console.log(`data.updates`, data.updates)
		const asleep = data.updates.asleep
		// loop through all the sleeping dice
		asleep.reverse().forEach(async (dieIndex,i) => {
			// remove the sleeping die from the dieCache. It's been removed from the physics simulation and will no longer send position updates in the data array
			const sleeper = dieCache.splice(dieIndex,1)[0]
			// mark this die as asleep
			sleeper.asleep = true
			// cache all the dice that are asleep
			sleeperCache.push(sleeper)
			// get die result now that it's asleep
			let result = await Dice.getRollResult(sleeper)
			// special case for d100's since they are a pair of dice
			// d100's will have a d10Instance prop and the d10 they are paired with will have a dieParent prop
			if(sleeper.d10Instance || sleeper.dieParent) {
				// if one of the pair is asleep and the other isn't then it falls through without getting the roll result
				// otherwise both dice in the d100 are asleep and ready to calc their roll result
				if(sleeper?.d10Instance?.asleep || sleeper?.dieParent?.asleep) {
					const d100 = sleeper.sides === 100 ? sleeper : sleeper.dieParent
					const d10 = sleeper.sides === 10 ? sleeper : sleeper.d10Instance
					if (d10.result === 0 && d100.result === 0) {
					d100.result = 100; // 00 + 0 is 100 on a d100
					} else {
					d100.result = d100.result + d10.result
					}

					// self.postMessage({action:"roll-result", die: {
					// 	groupId: d100.groupId,
					// 	rollId: d100.rollId,
					// 	id: d100.id,
					// 	result : d100.result
					// }})
					this.onRollResult({
						groupId: d100.groupId,
						rollId: d100.rollId,
						id: d100.id,
						result : d100.result
					})
				}
			} else {
				// turn 0's on a d10 into a 10
				if(sleeper.sides === 10 && sleeper.result === 0) {
					sleeper.result = 10
				}

				// self.postMessage({action:"roll-result", die: {
				// 	groupId: sleeper.groupId,
				// 	rollId: sleeper.rollId,
				// 	id: sleeper.id,
				// 	result: sleeper.result
				// }})
				this.onRollResult({
					groupId: sleeper.groupId,
					rollId: sleeper.rollId,
					id: sleeper.id,
					result: sleeper.result
				})
			}
		})
	
		// any dice that are not asleep are still moving - pass the remaining physics data to our handler
		const updates = data.updates.movements
		// apply the dice position updates to the scene meshes
		this.handleUpdates(updates)
	}
	
	// handle the position updates from the physics worker. It's a simple flat array of numbers for quick and easy transfer
	handleUpdates(updates) {
		// move through the updates 7 at a time getting position and rotation values
		// const dieCacheLength = dieCache.length
		for (let i = 0, len = updates.length; i < len; i++) {
			if (!dieCache[i]) break
			let [px,py,pz,qx,qy,qz,qw,id] = updates[i]
			let obj = dieCache[i].mesh
			if(dieCache[i].id !== id) {
				console.error("id does not match")
			}
			obj.position.set(px, py, pz)
			obj.rotationQuaternion.set(qx, qy, qz, qw)
		}
	}
	
	resize(data) {
		// redraw the dicebox
		diceBox.create({aspect: canvas.width / canvas.height})
		engine.resize()
	}
}

export default WorldOnscreen