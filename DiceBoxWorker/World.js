import { createEngine } from './systems/engine'
import { createCanvas } from './components/canvas'
import { createScene } from './components/scene'
import { createCamera } from './components/camera'
import { createDiceBox } from './components/diceBox'
import diceWorker from './components/Dice/physics.worker?worker'
import Dice from './components/Dice'

let canvas, engine, scene, camera, lights, worker

class World {
  constructor(container, options = {}){
    const defaultOptions = {
      enableDebugging: false,
      enableShadows: true,
      usePointLights: false
    }
    this.config = {...defaultOptions, ...options}
    canvas = createCanvas(container, 'dice-canvas')
    engine = createEngine(canvas)
    worker = new diceWorker()
    worker.onmessage = (e) => {
      // console.log('main thread event',e)
      if(e.data?.msg === "updates"){
        // console.log(`e.data.update`, e.data.updates)
        this.handleUpdates(e.data.updates)
      }
    }
    // this.dieCache = dieCache
    this.enableShadows = this.config.enableShadows
    // this.initScene(engine)
  }

  async initScene() {
    scene = await createScene(engine, this.config.enableDebugging)
    camera = await createCamera(this.config.enableDebugging)
    if(this.config.usePointLights) {
      const lightsModule = await import('./components/pointLights')
      lights = lightsModule.createPointLights(this.config.enableShadows)
    }
    else {
      const lightsModule = await import('./components/lights')
      lights = lightsModule.createLights(this.config.enableShadows)
    }
    createDiceBox({size: 35}, canvas, {
      ...this.config,
      lights,
    })
    
    Dice.loadModels().then(()=>{
      worker.postMessage({msg: 'init', width: canvas.clientWidth, height: canvas.clientHeight, size: 35})
    })


    scene.dieCache = []
    
    this.render()
  }
  
  renderLoop() {
    const diceAwake = scene.dieCache.map(die => die.asleep).includes(false)
    if(scene.dieCache.length && !diceAwake && !this.config.enableDebugging) {
      console.log(`no dice moving`)
      engine.stopRenderLoop()
    }
    else {
      scene.render()
    }
    // scene.render()
  }

  render() {
    // document.body.addEventListener('click',()=>engine.stopRenderLoop())
    engine.runRenderLoop(this.renderLoop.bind(this))
  }

  handleUpdates(updates){
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

  async add(options) {
    // console.log(`lights`, lights)
    // TODO: allow type to indlude various notations such as 2d20
    const newDie = await Dice.loadDie(options).then( response =>  new Dice(response, lights, this.config.enableShadows))
    scene.dieCache.push(newDie)
    worker.postMessage({msg: 'addDie', dieType: options.dieType})
    return newDie
  }

  async roll(die) {
    // const newDie = Dice.rollPromise(die).then(res => {
    //   console.log(`${die.dieType}-${die.id} result:`, res)
    //   return res
    // })
    worker.postMessage({msg: 'roll', dieType: options.dieType})
    // console.log(`newDie`, newDie)
  }
}

export default World