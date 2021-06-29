import { createCanvas } from './components/canvas'
import worldWorker from './WorldOffscreen?worker'
import diceWorker from './components/Dice/physics.worker?worker'

let canvas, physicsWorker, physicsWorkerInit, offscreen, offscreenWorker, offscreenWorkerInit

class World {
  constructor(container, options = {}){
    canvas = createCanvas(container, 'dice-canvas')

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
  }

  async initScene(options = {}) {
    // console.log("initScene")
    const defaultOptions = {
      enableDebugging: false,
      enableShadows: true,
      usePointLights: false
    }

    // initalize the offscreen worker
    offscreenWorker.postMessage({
      action: "init",
      canvas: offscreen,
      width: canvas.clientWidth,
      height:canvas.clientHeight,
      config: {...defaultOptions, ...options}
    }, [offscreen])

    offscreenWorker.onmessage = (e) => {
      // case: "init-complete" => fulfill promise so other things can run
      if(e.data.action === "init-complete") {
        // console.log("received worldOffscreenWorker message: init-complete")
        offscreenWorkerInit()
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
    offscreenWorker.postMessage({
      action: "addDie",
      options
    })
    // add die to physics worker here?
    // do we need to pass a unique identifyer?
    // should there be a response?
  }

  // roll(die) {
  //   // console.log("roll that die!")
  //   physicsWorker.postMessage({
  //     action: 'rollDie',
  //     die
  //   })
  // }

  roll(notation) {
    // reset the offscreen worker and physics worker with each new roll
    offscreenWorker.postMessage({
      action: "reset"
    })
    const rolling = this.parse(notation)
    for (var i = 0; i < rolling.number; i++) {
      this.add({dieType:rolling.type})
    }
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
    var roll = cleanNotation.match(diceNotation), mod = 0;
    var msg = 'Invalid notation: ' + notation + '';

    if (roll.length < 3) {
      throw new Error(msg);
    }
    if (roll[3] && modifier.test(roll[3])) {
      var modParts = roll[3].match(modifier);
      var basicMod = validNumber(modParts[2], msg);
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