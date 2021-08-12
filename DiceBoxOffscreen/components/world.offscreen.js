import { createEngine } from './engine'
import { createScene } from './scene'
import { createCamera } from './camera'
import { createDiceBox } from './diceBox'
import { createLights } from './lights'
import Dice from './Dice'

let canvas, config, engine, scene, camera, lights, physicsWorkerPort, dieCache = [], sleeperCache = [], count = 0

// these are messages sent to this worker from World.js
self.onmessage = (e) => {
  switch( e.data.action ) {
    case "rollDie":
      // kick it over to the physics worker
      physicsWorkerPort.postMessage({
        action: "roll"
      })
      break
    case "addDie":
      // console.log("time to add die", e.data.options)
			// space out adding the dice so they don't lump together too much
			setTimeout(() => {
				add(e.data.options)
			}, count++ * config.delay)
      break
    case "clearDice":
      // stop anything that's currently rendering
      engine.stopRenderLoop()
      // clear all dice
      dieCache.forEach(die => die.mesh.dispose())
      sleeperCache.forEach(die => die.mesh.dispose())
			Dice.resetCount()
			count = 0

			scene.render()
			// setTimeout(() => {},10)
			engine.stopRenderLoop()

      dieCache = []
      sleeperCache = []

      // start rendering again
			// TODO: need to step animation loop one frame
      // render()
      break
    case "resize":
      canvas.width = e.data.width
      canvas.height = e.data.height
			// redraw the dicebox
			createDiceBox({
				...config,
				size: 25,
				aspect: canvas.width / canvas.height,
				lights,
			})
      engine.resize()
			
      break
    case "init":
      // console.log("time to init")
      canvas = e.data.canvas
      config = e.data.config
      canvas.width = e.data.width
      canvas.height = e.data.height
    
      engine = createEngine(canvas)
      initScene()
      break
    case "connect": // These are messages sent from physics.worker.js
      // console.log("connecting to port", e.ports[0])
      physicsWorkerPort = e.ports[0]
      physicsWorkerPort.onmessage = (e) => {
        switch (e.data.action) {
          case "updates": // dice status/position updates from physics worker
					// TODO: time to move this to it's own function
            // get dice that are sleeping.
            // console.log(`e.data.updates`, e.data.updates)
            const asleep = e.data.updates.asleep
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
                  const d100Result = await Dice.getRollResult(d100)
                  const d10Result = await Dice.getRollResult(d10)
                  if (d10Result === 0 && d100Result === 0) {
                    result = 100; // 00 + 0 is 100 on a d100
                  } else {
                    result = d100Result + d10Result
                  }
                  // console.log(`d100 result:`, result)
									self.postMessage({action:"roll-result", die: {
										rollId: d100.rollId,
										groupId: d100.groupId,
										result
									}})
                }
              } else {
                // console.log(`${sleeper.sides} result:`, result)
								// console.log(`sleeper`, sleeper)
								// turn 0's on a d10 into a 10
								if(sleeper.sides === 10 && sleeper.result === 0) {
									sleeper.result = 10
								}
								self.postMessage({action:"roll-result", die: {
									rollId: sleeper.rollId,
									groupId: sleeper.groupId,
									result: sleeper.result
								}})
              }
            })

            // any dice that are not asleep are still moving - pass the remaining physics data to our handler
            const updates = e.data.updates.movements
            // apply the dice position updates to the scene meshes
            handleUpdates(updates)

            break;
        
          default:
            console.error("action from physicsWorker not found in offscreen worker")
            break;
        }
      }
      break
    default:
      console.error("action not found in offscreen worker")
  }
}

// initialize the babylon scene
const initScene = async () => {
  scene = await createScene({debug: config.enableDebugging})
  camera = await createCamera({debug: config.enableDebugging, engine})
  lights = createLights({enableShadows: config.enableShadows})

  // initialize die caches
  // the dieCache order must match the physicsWorker's colliders order so the positioning data matches up
  dieCache = [] // cache dice that are rolling
  sleeperCache = [] // cache dice that have stopped rolling
console.log(`config`, config)
  // create the box that provides surfaces for shadows to render on
  createDiceBox({
    ...config,
    size: 25,
    aspect: canvas.width / canvas.height,
    lights,
  })
  
  // loading all our dice models
  // we use to load these models individually as needed, but it's faster to load them all at once and prevents animation jank when rolling
  await Dice.loadModels()
  
  // start the render engine
  // render()

  // init complete - let the world know
  self.postMessage({action:"init-complete"})
}

// all this does is start the render engine.
const render = () => {
  // document.body.addEventListener('click',()=>engine.stopRenderLoop())
  engine.runRenderLoop(renderLoop.bind(this))
	physicsWorkerPort.postMessage({
		action: "resumeSimulation",
	})
}

// const resumeRender = () => {
// 	render()
// 	physicsWorkerPort.postMessage({
// 		action: "resumeSimulation",
// 	})
// }

const renderLoop = () => {
  // TODO: now that we're caching both a dieCache and a sleeperCache, we can probably rework this
  // are there any dice still awake in the dieCache?
  // const diceAwake = dieCache?.map(die => die.asleep).includes(false) | false
  // if no dice awake then stop the render loop and save some CPU power (unless we're in debug mode where we want the arc camera to continue working)
  if(sleeperCache.length !== 0 && dieCache.length === 0 && !config.enableDebugging) {
    console.log(`no dice moving`)
    engine.stopRenderLoop()
    physicsWorkerPort.postMessage({
      action: "stopSimulation",
    })
		self.postMessage({
			action: "roll-complete"
		})
  }
  // otherwise keep on rendering
  else {
    scene.render()
  }
}

// add a die to the scene
const add = async (options) => {
	options.dieType = `d${options.sides}`
	if(engine.activeRenderLoops.length === 0) {
		render()
	}
  // loadDie allows you to specify sides(dieType) and theme and returns the options you passed in
  const newDie = await Dice.loadDie(options).then( response =>  {
    // after the die model and textures have loaded we can add the die to the scene for rendering
    return new Dice(response, lights, config.enableShadows)
  })

	newDie.rollId = options.rollId
	newDie.groupId = options.groupId

	// console.log(`newDie`, newDie)

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
    // Should the d10 come a few seconds after the d100 is tossed?
    // setTimeout(async() => {
    // assign the new die to a property on the d100 - spread the options in order to pass a matching theme
    newDie.d10Instance = await Dice.loadDie({...options, sides: 10, dieType: 'd10'}).then( response =>  {
      const d10Instance = new Dice(response, lights, config.enableShadows)
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
  // }, 1000)
  }

	// console.log(`newDie`, newDie)

  // return the die instance
  return newDie

}

// handle the position updates from the physics worker. It's a simple flat array of numbers for quick and easy transfer
const handleUpdates = (updates) => {
  // move through the updates 7 at a time getting position and rotation values
  const dieCacheLength = dieCache.length
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