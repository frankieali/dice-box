var Module = { TOTAL_MEMORY: 256 * 1024 * 1024 }

import { createEngine } from './systems/engine'
import { createScene } from './components/scene'
import { createCamera } from './components/camera'
import { createDiceBox } from './components/diceBox'
import Dice from './components/Dice'

let canvas, config, engine, scene, camera, lights, worker


self.onmessage = (e) => {
  console.log("got the message")
  if (e.data.action === "init"){
    console.log("time to init")
    canvas = e.data.canvas
    config = e.data.config
  
    engine = createEngine(canvas)
    initScene()
  }
  else if (e.data.action === "addDie") {

  }


}

const initScene = async () => {
  console.log("init")
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
  
  Dice.loadModels().then(()=>{
    worker.postMessage({msg: 'init', width: canvas.clientWidth, height: canvas.clientHeight, size: 35})
  })


  scene.dieCache = []
  
  render()
}
  
const renderLoop = () => {
  const diceAwake = scene.dieCache.map(die => die.asleep).includes(false)
  if(scene.dieCache.length && !diceAwake && !config.enableDebugging) {
    console.log(`no dice moving`)
    engine.stopRenderLoop()
  }
  else {
    scene.render()
  }
  // scene.render()
}

const render = () => {
  // document.body.addEventListener('click',()=>engine.stopRenderLoop())
  engine.runRenderLoop(renderLoop.bind(this))
}

const handleUpdates = (updates) => {
  const objectCount = scene.dieCache.length
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

const add = (options) => {
  // console.log(`lights`, lights)
  // TODO: allow type to indlude various notations such as 2d20
  const newDie = await Dice.loadDie(options).then( response =>  new Dice(response, lights, config.enableShadows))
  scene.dieCache.push(newDie)
  worker.postMessage({msg: 'addDie', dieType: options.dieType})
  return newDie
}

const roll = (die) => {
  // const newDie = Dice.rollPromise(die).then(res => {
  //   console.log(`${die.dieType}-${die.id} result:`, res)
  //   return res
  // })
  worker.postMessage({msg: 'roll', dieType: options.dieType})
  // console.log(`newDie`, newDie)
}