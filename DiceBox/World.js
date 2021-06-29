import { createEngine } from './systems/engine'
import { createCanvas } from './components/canvas'
import { createScene } from './components/scene'
import { createCamera } from './components/camera'
import { createLights } from './components/lights'
import { createPointLights } from './components/pointLights'
import { createDiceBox } from './components/diceBox'
// import { createInstrumentation } from './systems/instrumentation'
import { Quaternion, Vector3, Matrix } from "@babylonjs/core/Maths/math.vector";
import Dice from './components/Dice'
// import Spheres from './components/Spheres'

let canvas, engine, scene, camera, lights

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
    // this.dieCache = dieCache
    this.enableShadows = this.config.enableShadows
    // this.initScene(engine)
  }

  async initScene() {
    scene = await createScene(engine, this.config.enableDebugging)
    camera = await createCamera(this.config.enableDebugging)
    if(this.config.usePointLights) {
      lights = createPointLights(this.config.enableShadows)
    }
    else {
      lights = createLights(this.config.enableShadows)
    }
    // createInstrumentation(engine, scene)
    createDiceBox({size: 35}, canvas, {
      ...this.config,
      lights,
    })
    scene.dieCache = []
    // new Spheres(engine, scene, lights.directional, 50)
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

  async add(options) {
    // console.log(`lights`, lights)
    // TODO: allow type to indlude various notations such as 2d20
    const newDie = await Dice.loadModel(options).then(response => new Dice(response, lights, this.config.enableShadows))
    console.log(`newDie`, newDie)
    newDie.mesh.position = new Vector3(0,10,0)
    scene.dieCache.push(newDie)
    return newDie
  }

  async roll(die) {
    const newDie = Dice.rollPromise(die).then(res => {
      console.log(`${die.dieType}-${die.id} result:`, res)
      return res
    })
    // console.log(`newDie`, newDie)
  }
  rollFormula = function(notation) {
    var no = notation.split('@');
    var dr0 = /\s*(\d*)([a-z]+)(\d+)(\s*(\+|\-)\s*(\d+)){0,1}\s*(\+|$)/gi;
    var dr1 = /(\b)*(\d+)(\b)*/gi;
    var ret = { set: [], constant: 0, result: [], error: false }, res;
    while (res = dr0.exec(no[0])) {
        var command = res[2];
        if (command != 'd') { ret.error = true; continue; }
        var count = parseInt(res[1]);
        if (res[1] == '') count = 1;
        var type = 'd' + res[3];
        if (this.known_types.indexOf(type) == -1) { ret.error = true; continue; }
        while (count--) ret.set.push(type);
        if (res[5] && res[6]) {
            if (res[5] == '+') ret.constant += parseInt(res[6]);
            else ret.constant -= parseInt(res[6]);
        }
    }
    while (res = dr1.exec(no[1])) {
        ret.result.push(parseInt(res[2]));
    }
    return ret;
  }
  // formula(notation){
  //   var dict = {}, notation = '';
  //   for (var i in nn.set) 
  //       if (!dict[nn.set[i]]) dict[nn.set[i]] = 1; else ++dict[nn.set[i]];
  //   for (var i in dict) {
  //       if (notation.length) notation += ' + ';
  //       notation += (dict[i] > 1 ? dict[i] : '') + i;
  //   }
  //   if (nn.constant) {
  //       if (nn.constant > 0) notation += ' + ' + nn.constant;
  //       else notation += ' - ' + Math.abs(nn.constant);
  //   }
  //   return notation;
  // }
}

export default World