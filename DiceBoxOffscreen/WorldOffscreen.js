import { createEngine } from './systems/engine'
import { createScene } from './components/scene'
import { createCamera } from './components/camera'
import { createDiceBox } from './components/diceBox'
import Dice from './components/Dice'

let canvas, config, engine, scene, camera, lights, physicsWorkerPort
self.onmessage = (e) => {
  switch( e.data.action ) {
    case "rollDie":
      // console.log("time to roll the die", e.data.options)
      // kick it over to the physics worker
      physicsWorkerPort.postMessage({
        action: "roll"
      })
      break
    case "addDie":
      // console.log("time to add die", e.data.options)
      add(e.data.options)
      break
    case "reset":
      // stop anything that's currently rendering
      engine.stopRenderLoop()
      physicsWorkerPort.postMessage({action: "reset"})
      // clear all dice
      if(scene.dieCache?.length) {
        scene.dieCache.forEach(die => {
          console.log(`die`, die)
          die.mesh.dispose()
        })
      }
      if(scene.sleeperCache?.length) {
        scene.sleeperCache.forEach(die => die.mesh.dispose())
      }

      scene.dieCache = null
      scene.sleeperCache = null

      // start rendering again
      render()
      break
    case "resize":
      canvas.width = e.data.width
      canvas.height = e.data.height
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
    case "connect":
      // console.log("connecting to port", e.ports[0])
      physicsWorkerPort = e.ports[0]
      physicsWorkerPort.onmessage = (e) => {
        switch (e.data.action) {
          case "reset":
            // do stuff to remove all physics bodies
            break;
          case "updates":
            // const updates = new Float64Array(e.data.bufferData)
            const asleep = e.data.updates.sleepingBodies
            asleep.forEach(async (dieIndex,i) => {
              const sleeper = scene.dieCache.splice(dieIndex-i,1)[0]
              sleeper.asleep = true
              scene.sleeperCache.push(sleeper)
              // console.log(`scene.dieCache.length`, scene.dieCache.length)
              // get die result now that it's asleep
              let result = await Dice.getRollResult(sleeper)
              if(sleeper.d10Instance || sleeper.dieParent) {
                if(sleeper?.d10Instance?.asleep || sleeper?.dieParent?.asleep) {
                // if(sleeper.dieType === 'd100' && sleeper.d10Instance.asleep) {
                  const d100 = sleeper.dieType === 'd100' ? sleeper : sleeper.dieParent
                  const d10 = sleeper.dieType === 'd10' ? sleeper : sleeper.d10Instance
                  const d100Result = await Dice.getRollResult(d100)
                  const d10Result = await Dice.getRollResult(d10)
                  if (d10Result === 0 && d100Result === 0) {
                    result = 100;
                  } else {
                    result = d100Result + d10Result
                  }
                  console.log(`d100 result:`, result)
                }
              } else {
                console.log(`${sleeper.dieType} result:`, result)
              }
            })
            const updates = e.data.updates.movements
            handleUpdates(updates)
            break;
        
          default:
            break;
        }
      }
      break
    default:
      console.error("action not found in offscreen worker")
  }
}

const initScene = async (options) => {
  // console.log("init")
  console.log(`config`, config)
  scene = await createScene(engine, config.enableDebugging)
  camera = await createCamera(config.enableDebugging)
  if(config.usePointLights) {
    const lightsModule = await import('./components/pointLights')
    lights = lightsModule.createPointLights(config.enableShadows)
  }
  else {
    const lightsModule = await import('./components/lights')
    lights = lightsModule.createLights(config.enableShadows)
  }
  createDiceBox({size: 35}, canvas, {
    ...config,
    lights,
  })
  
  await Dice.loadModels()

  // scene.dieCache = []
  
  render()
  // console.log(engine.getRenderWidth() + "," + engine.getRenderHeight());
  self.postMessage({action:"init-complete"})
}

const render = () => {
  // document.body.addEventListener('click',()=>engine.stopRenderLoop())
  engine.runRenderLoop(renderLoop.bind(this))
}

const renderLoop = () => {
  const diceAwake = scene.dieCache?.map(die => die.asleep).includes(false) | false
  if(scene.dieCache && !diceAwake && !config.enableDebugging) {
    console.log(`no dice moving`)
    engine.stopRenderLoop()
  }
  else {
    scene.render()
  }
  // scene.render()
}

const add = async (options) => {
  // console.log(`options`, options)
  // TODO: allow type to indlude various notations such as 2d20
  const newDie = await Dice.loadDie(options).then( response =>  {
    return new Dice(response, lights, config.enableShadows)
  })

  if(!scene.dieCache) {
    scene.dieCache = []
    scene.sleeperCache = []
  }

  scene.dieCache.push(newDie)
  physicsWorkerPort.postMessage({
    action: "addDie",
    die: options.dieType
  })

  if(options.dieType === 'd100') {
    console.log('attach another d10 for d100 roll')
    // setTimeout(async() => {
    newDie.d10Instance = await Dice.loadDie({dieType: 'd10'}).then( response =>  {
      const d10Instance = new Dice(response, lights, config.enableShadows)
      d10Instance.dieParent = newDie
      return d10Instance
    })
    scene.dieCache.push(newDie.d10Instance)
    physicsWorkerPort.postMessage({
      action: "addDie",
      die: 'd10'
    })
  // }, 1000)
  }
  // console.log(`newDie`, newDie)

  return newDie

  // const newDie = await Dice.loadDie(options)
}

const handleUpdates = (updates) => {
  const objectCount = scene.dieCache?.length | 0
  let index = 0
  for (let i = 0; i < updates.length; i += 7) {
    let px = updates[i + 0]
    let py = updates[i + 1]
    let pz = updates[i + 2]
    let qx = updates[i + 3]
    let qy = updates[i + 4]
    let qz = updates[i + 5]
    let qw = updates[i + 6]
    let obj = scene.dieCache[index].mesh
    // console.log(`position--${index}`, px, py, pz)
    obj?.position?.set(px, py, pz)
    obj?.rotationQuaternion?.set(qx, qy, qz, qw)
    index++
  }
}