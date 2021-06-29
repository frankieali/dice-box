// import { Mesh, PhysicsImpostor, SceneLoader, TransformNode, Vector3 } from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
// import '@babylonjs/core/Loading/Plugins/babylonFileLoader'
import '@babylonjs/loaders/glTF/2.0/glTFLoader'
import '@babylonjs/core/Meshes/instancedMesh'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'

import { loadTheme } from './themes'
import { lerp } from '../../helpers'

// caching some variables here
let meshes = {}, themes = {}, diceCombos = {}, count = 1, lights = [], defaultTheme = 'nebula'

class Dice {

  constructor({dieType, theme = defaultTheme}, sceneLights, enableShadows) {
    lights = sceneLights
    this.id = count
    this.dieType = dieType
    this.mesh = null
    this._result = null
    this.asleep = false
    this.theme = theme
    this.enableShadows = enableShadows
    this.comboKey = `${dieType}_${theme}`
    this.setTimeout = null
    this.createInstance()
  }
  
  get result() {
    return this._result
  }

  set result(val) {
    this._result = val
    this.resultListener(val)
  }

  resultListener(val) {
    // console.log("no active listener function")
  }

  registerNewListener(externalListenerFunction) {
    this.resultListener = externalListenerFunction
  }

  // TODO: this does not have to be on every die. Make it static
  createInstance(options) {
    // create die instance
    const dieInstance = diceCombos[this.comboKey].createInstance(`${this.dieType}-instance-${count}`)

    meshes[this.dieType].getChildTransformNodes().map(child => {
      const locator = child.clone(child.id)
      // console.log(`child.position`, child.position)
      locator.setAbsolutePosition(child.getAbsolutePosition())
      // console.log(`locator.getAbsolutePosition()`, locator.getAbsolutePosition())
      dieInstance.addChild(locator)
    })
    if(this.enableShadows){
      for (const key in lights) {
        if(key !== 'hemispheric' ) {
          lights[key].shadowGenerator.addShadowCaster(dieInstance)
        }
      }
    }

    // // drop in collider for this instance
    // meshes[this.dieType].collider.setParent(dieInstance)

    // dieInstance.physicsImpostor = new PhysicsImpostor(dieInstance, PhysicsImpostor.NoImpostor, dicePhysicalProperties[this.dieType])
    // dieInstance.physicsImpostor.physicsBody.setSleepingThresholds(.01, .01)
    // // check the dice speed on each frame - don't forget to unregister
    // dieInstance.physicsImpostor.registerAfterPhysicsStep(Dice.isAsleep.bind(this))

    // attach the instance to the class object
    this.mesh = dieInstance

    // // return the collider for re-instancing
    // meshes[this.dieType].collider.setParent(null)

    // if(options.dieType === 'd100') {
    //   console.log("attach a d10")
    //   this.d10Instance = this.createInstance({dieType:'d10'})
    // }

    console.log(`count`, count)
    count++
  }

  // TODO: add themeOptions for colored materials, must ensure theme and themeOptions are unique somehow
  static async loadDie(options) {
    const { dieType, theme = defaultTheme} = options
    const comboKey = `${dieType}_${theme}`

    // console.log(`Die options to load`, options)

    // load the theme first
    if (!Object.keys(themes).includes(theme)) {
      themes[theme] = await loadTheme(theme)
    }

    // load the model
    // TODO: getting multiple "original" models since meshes[dieType] is flagged after loading assets - must await or Promise
    // if (!Object.keys(meshes).includes(dieType)) {
    //   const model = await SceneLoader.ImportMeshAsync(["die","collider"], "./DiceBox/assets/models/", `${dieType}.glb`)
    //   const root = model.meshes[0]
    //   // assuming
    //   const die = model.meshes[1]
    //   const collider = model.meshes[2]

    //   root.setEnabled(false)
    //   root.id = `${dieType}-original`
    //   root.name = `${dieType}-original`
      
    //   die.setEnabled(false)
    //   die.receiveShadows = true
    //   die.freezeNormals()
      
    //   collider.setEnabled(false)
    //   collider.isVisible = false
    //   collider.forceSharedVertices()
    //   // collider.doNotSyncBoundingInfo = true
    //   // collider.physicsImpostor = new PhysicsImpostor(collider, PhysicsImpostor.ConvexHullImpostor)

    //   // cache model data for instances
    //   meshes[dieType] = {
    //     root,
    //     die,
    //     collider
    //   }
    // }

    // cache die and theme combo for instances
    if (!Object.keys(diceCombos).includes(comboKey)) {
      // console.log(`meshes`, meshes)
      const die = meshes[dieType].clone(comboKey)
      die.material = themes[theme]
      // die.material.freeze()
      diceCombos[comboKey] = die
    }

    return options
  }

  // load all the dice from a webWorker
  static async loadModels(options) {
    const models = await SceneLoader.ImportMeshAsync("", "/DiceBoxOffscreen/assets/models/diceMeshes.glb")
    // const model = await SceneLoader.ImportMeshAsync(["die","collider"], "./DiceBox/assets/models/", `d20.glb`)
    models.meshes.forEach(model => {
      // console.log(`model.id`, model.id)
      if(model.id === "__root__") return
      model.setEnabled(false)
      model.receiveShadows = true
      model.freezeNormals()
      // model.scaling = new Vector3(1, 1, 1)
      meshes[model.id] = model
    })
    // return models
  }

  static rollPromise(die) {

    const mesh = die.mesh
    const impostor = mesh.physicsImpostor
    const scene = mesh.getScene()
    const diceBox = scene.getNodeByID('ground')
    const position = new Vector3(0,8,0)
    const bounds = diceBox.getBoundingInfo().boundingBox

    // if(die.dieType === 'd100') {
    //   die.d10Instance = Dice.loadModel({dieType:'d10',theme:die.theme})
    //     .then(response => new Dice(response, lights, die.enableShadows))
    //     .then(die => {
    //       // save this additional die - will need it to check if all dice are asleep later
    //       scene.dieCache.push(die)
    //       return Dice.rollPromise(die)
    //     })
    //     .then(res => res)
    // }

    die.result = null
    die.asleep = false

    mesh.position = position
    mesh.addRotation(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )

    // can throw target just be clientWidth and clientHeight?
    const throwTarget = new Vector3(
      lerp(bounds.minimumWorld.x, bounds.maximumWorld.x, Math.random()),
      5,
      lerp(bounds.minimumWorld.z, bounds.maximumWorld.z, Math.random())
    );

    const impulse = new Vector3(0, 0, 0)
      .subtract(throwTarget)
      .normalizeToNew()
      .scale(lerp(300, 800, Math.random()))

    // This might affect re-rolling
    impostor.disableBidirectionalTransformation = true

    // remove any velocity the die might still have
    impostor.setLinearVelocity(Vector3.Zero())
    impostor.setAngularVelocity(Vector3.Zero())

    impostor.applyImpulse(
      impulse,
      impostor.getObjectCenter()
    )
    
    return new Promise((resolve,reject) => {
      // return the promise when we have a result value
      return die.registerNewListener(val => resolve(val))
    })
  }

  static async getRollResult(die) {
    const getDieRoll = (d=die) => new Promise((resolve,reject) => {
    // const getDieRoll = (d = die) => {
      let highestDot = -1
      let highestLocator
      for (let locator of d.mesh.getChildTransformNodes()) {
        // I don't think I need this.
        // let dif = locator
        //   .getAbsolutePosition()
        //   .subtract(die.mesh.getAbsolutePosition())
        // let direction = dif.normalize()
        // const dot = Vector3.Dot(direction, Vector3.Up())
        // console.log(`${locator.id}:`, locator)
        // console.log(`${locator.id}:`, locator.position.x,locator.position.y,locator.position.z)

        // const dot = Vector3.Dot(locator.getAbsolutePosition(), Vector3.Up())
        const dot = locator.up.y
        // const dot = locator.position.z
        if (dot > highestDot) {
          highestDot = dot
          highestLocator = locator
        }
      }
      
      // const vector = new Vector3(0, 1, 0)
      // const pickResult = worldScene.pickWithRay(new Ray(d.mesh.position, vector, 5))

      // locators may have crazy names after being instanced, but they all end in '_##' for the face they are on
      return resolve(parseInt(highestLocator.name.slice(highestLocator.name.lastIndexOf('_')+1)))
    })

    let number

    // If the dice is a d100 add the d10
    // if(die.dieType === 'd100') {
    //   const d100Result = await getDieRoll()
    //   const d10Result = await getDieRoll(die.d10Instance)
    //   if (d10Result === 0 && d100Result === 0) {
    //     number = 100;
    //   } else {
    //     number = d100Result + d10Result
    //   }
    // } else {
    //   number = await getDieRoll()
    // }

    // console.log("result", number)
    return await getDieRoll()

    return number

  }

  static isAsleep() {
    const die = this
    if(die.asleep) {
      return
    }
    const impostor = die.mesh.physicsImpostor
// ___________________________STATE
//  1  : ACTIVE
//  2  : ISLAND_SLEEPING
//  3  : WANTS_DEACTIVATION
//  4  : DISABLE_DEACTIVATION
//  5  : DISABLE_SIMULATION

// ___________________________FLAG
//  0  : RIGIDBODY
//  1  : STATIC_OBJECT
//  2  : KINEMATIC_OBJECT
//  4  : NO_CONTACT_RESPONSE
//  8  : CUSTOM_MATERIAL_CALLBACK
//  16 : CHARACTER_OBJECT
//  32 : DISABLE_VISUALIZE_OBJECT
//  64 : DISABLE_SPU_COLLISION_PROCESSING


    const speed = impostor.getLinearVelocity().length()

    if(speed < .01 && !die.sleepTimeout) {
      // TODO: perhaps clear/reset timeout if die takes a collision that re-accelerates it
      die.sleepTimeout = setTimeout(()=>{
        die.asleep = true
        die.result = Dice.getRollResult(die)
      }, 500)
      impostor.physicsBody.setMassProps(0)
      impostor.physicsBody.forceActivationState(3)
      // zero out anything left
      impostor.setLinearVelocity(Vector3.Zero())
      impostor.setAngularVelocity(Vector3.Zero())
    }
  }
}

export default Dice