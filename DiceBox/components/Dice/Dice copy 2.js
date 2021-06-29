import { Mesh, PhysicsImpostor, SceneLoader, TransformNode, Vector3 } from '@babylonjs/core'
import { loadTheme } from './themes'
import { lerp } from '../../helpers'

let meshes = {}, themes = {}, diceCombos = {}, count = 1, lights = []
let dicePhysicalProperties = {
  d4:{ mass: 14, friction: 1, restitution: .2 },
  d6:{ mass: 16, friction: 1, restitution: .2 },
  d8:{ mass: 16.2, friction: 1, restitution: .2 },
  d10:{ mass: 17, friction: 1, restitution: .2 },
  d12:{ mass: 18, friction: 1, restitution: .2 },
  d20:{ mass: 20, friction: 1, restitution: .2 },
  d100:{ mass: 17, friction: 1, restitution: .2 },
}

// caching some variables here


class Dice {

  constructor({dieType, theme = 'nebula'}, sceneLights, enableShadows) {
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
    // if(Object.keys(diceCombos).includes(this.comboKey)) {
      this.createInstance()
    // } else {
    //   this.createClone()
    // }
    // Dice.createInstance().call(this)
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
    // const original = diceCombos[`${this.dieType}_${this.theme}`]
    // const parent = new TransformNode(`${this.dieType}-${count}`)
    const parent = new Mesh(`${this.dieType}-${count}`)

    // console.log(`diceCombos`, diceCombos)

    // create die instance
    const dieInstance = diceCombos[this.comboKey].createInstance(`${this.dieType}-instance-${count}`)
    // const locators = diceCombos[this.comboKey].getChildTransformNodes().map(locator => locator.clone())
    // dieInstance._children = [...locators]

    // diceCombos[this.comboKey].getChildTransformNodes().map(child => {
    meshes[this.dieType].die.getChildTransformNodes().map(child => {
      const locator = child.clone(child.id)
      locator.setAbsolutePosition(child.getAbsolutePosition())
      dieInstance.addChild(locator)
    })
    if(this.enableShadows){
      for (const key in lights) {
        if(key !== 'hemispheric' ) {
          lights[key].shadowGenerator.addShadowCaster(dieInstance)
        }
      }
      // lights.directional.shadowGenerator.addShadowCaster(dieInstance)
      // lights.point1.shadowGenerator.addShadowCaster(dieInstance)
      // lights.point2.shadowGenerator.addShadowCaster(dieInstance)
    }
    dieInstance.setParent(parent)

    // create collider instance
    // const colliderInstance = meshes[this.dieType].collider.clone(`${this.dieType}-collider-${count}`)
    // colliderInstance.isVisible = false
    // colliderInstance.physicsImpostor = new PhysicsImpostor(colliderInstance, PhysicsImpostor.ConvexHullImpostor)
    // // colliderInstance.instancedBuffers.physicsImpostor = new PhysicsImpostor(colliderInstance, PhysicsImpostor.ConvexHullImpostor)
    // console.log(`colliderInstance`, colliderInstance)
    // console.log(`meshes[this.dieType].collider`, meshes[this.dieType].collider)
    // // colliderInstance.physicsImpostor = meshes[this.dieType].collider.physicsImpostor.clone(colliderInstance)
    // colliderInstance.setParent(parent)
    meshes[this.dieType].collider.setParent(parent)

    count++
    // parent.position = new Vector3(Math.random(), 5 , Math.random())
    parent.physicsImpostor = new PhysicsImpostor(parent, PhysicsImpostor.NoImpostor, dicePhysicalProperties[this.dieType])
    parent.physicsImpostor.physicsBody.setSleepingThresholds(.01, .01)
    parent.physicsImpostor.registerAfterPhysicsStep(Dice.isAsleep.bind(this))
    
    console.log(`parent`, parent)

    meshes[this.dieType].collider.setParent(null)

    // colliderInstance.dispose()

    this.mesh = parent
  }

  createClone() {
    // console.log(`create clone`)
    // const parent = meshes[this.dieType].root.clone(`${this.comboKey}-clone`)
    const parent = new TransformNode(`${this.dieType}-${count}`)
    // parent.setEnabled(true)
    parent.getChildren().forEach(mesh => {
      if(mesh.name.includes('die')) {
        // mesh.id = `die-${count}`
        // mesh.name = `die-${count}`
        mesh.material = themes[this.theme]
        mesh.receiveShadows = true
        // mesh.isVisible = true
        mesh.setEnabled(true)
        if(this.enableShadows){
          for (const key in lights) {
            if(key !== 'hemispheric' ) {
              lights[key].shadowGenerator.addShadowCaster(mesh)
            }
          }
        }
        diceCombos[this.comboKey] = mesh
      }
      if(mesh.name.includes('collider')) {
        // mesh.id = `collider-${count}`
        // mesh.name = `collider-${count}`
        // mesh.convertToUnIndexedMesh();
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.ConvexHullImpostor)
      }
    });
    count++
    // parent.position = new Vector3(Math.random(), 5, Math.random())
    parent.physicsImpostor = new PhysicsImpostor(parent, PhysicsImpostor.NoImpostor, dicePhysicalProperties[this.dieType])
    parent.physicsImpostor.physicsBody.setSleepingThresholds(.01, .01)
    // console.log(`parent.physicsImpostor`, parent.physicsImpostor)
    parent.physicsImpostor.registerAfterPhysicsStep(Dice.isAsleep.bind(this))
    // console.log(`parent.physicsImpostor`, parent.physicsImpostor)

    this.mesh = parent

    // save combo
    
  }

  // TODO: add themeOptions for colored materials, must ensure theme and themeOptions are unique somehow
  static async loadModel(options) {
    const { dieType, theme = 'nebula'} = options
    const comboKey = `${dieType}_${theme}`

    // load the theme first
    if (!Object.keys(themes).includes(theme)) {
      themes[theme] = await loadTheme(theme)
    }

    // load the model
    // TODO: getting multiple "original" models since meshes[dieType] is flagged after loading assets - must await or Promise
    if (!Object.keys(meshes).includes(dieType)) {
      const model = await SceneLoader.ImportMeshAsync(["die","collider"], "./DiceBox/assets/models/", `${dieType}.glb`)
      const root = model.meshes[0]
      // assuming
      const die = model.meshes[1]
      const collider = model.meshes[2]

      // console.log(`model.meshes`, model.meshes)

      // const parent = new Mesh(`${dieType}-holder`)
      // die.parent = parent
      // collider.parent = parent

      root.setEnabled(false)
      root.id = `${dieType}-original`
      root.name = `${dieType}-original`
      
      die.setEnabled(false)
      die.receiveShadows = true
      die.freezeNormals()
      
      collider.setEnabled(false)
      collider.isVisible = false
      collider.forceSharedVertices()
      // collider.doNotSyncBoundingInfo = true
      // collider.registerInstancedBuffer("physicsImpostor", new PhysicsImpostor(collider, PhysicsImpostor.ConvexHullImpostor))
      collider.physicsImpostor = new PhysicsImpostor(collider, PhysicsImpostor.ConvexHullImpostor)
      // collider.physicsImpostor.physicsBody.forceActivationState(5)
      


      // cache model data for instances
      meshes[dieType] = {
        root,
        die,
        collider
      }

    }

    // cache die and theme combo for instances
    if (!Object.keys(diceCombos).includes(comboKey)) {
      const die = meshes[dieType].die.clone(comboKey)
      die.material = themes[theme]
      die.material.freeze()
      diceCombos[comboKey] = die
    }

    return options
  }

  static roll(die) {
    const mesh = die.mesh

    const scene = mesh.getScene()
    const diceBox = scene.getNodeByID('ground')
    const position = new Vector3(0,10,0)
    const bounds = diceBox.getBoundingInfo().boundingBox

    // console.log(`bounds`, bounds)
    // console.log(`mesh`, mesh)

    die.result = null
    die.asleep = false

    const throwTarget = new Vector3(
      lerp(bounds.minimumWorld.x, bounds.maximumWorld.x, Math.random()),
      5,
      lerp(bounds.minimumWorld.z, bounds.maximumWorld.z, Math.random())
    );

    const impulse = new Vector3(0, 0, 0)
      .subtract(throwTarget)
      .normalizeToNew()
      .scale(lerp(300, 600, Math.random()))

    mesh.physicsImpostor.position = position
    mesh.physicsImpostor.setLinearVelocity(Vector3.Zero())
    mesh.physicsImpostor.setAngularVelocity(Vector3.Zero())
    mesh.addRotation(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )
    mesh.physicsImpostor.applyImpulse(
      impulse,
      mesh.physicsImpostor.getObjectCenter()
    )

  }

  static rollPromise(die) {

    const mesh = die.mesh

    const scene = mesh.getScene()
    const diceBox = scene.getNodeByID('ground')
    const position = new Vector3(0,8,0)
    const bounds = diceBox.getBoundingInfo().boundingBox

    if(die.dieType === 'd100') {
      die.d10Instance = Dice.loadModel({dieType:'d10',theme:die.theme})
        .then(response => new Dice(response, lights, die.enableShadows))
        .then(die => {
          scene.dieCache.push(die)
          return Dice.rollPromise(die)
        })
        .then(res => {
          // console.log(`${die.dieType}-${die.id} result:`, res)
          return res
        })
    }

    die.result = null
    die.asleep = false

    mesh.position = position
    mesh.addRotation(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )

    const throwTarget = new Vector3(
      lerp(bounds.minimumWorld.x, bounds.maximumWorld.x, Math.random()),
      5,
      lerp(bounds.minimumWorld.z, bounds.maximumWorld.z, Math.random())
    );

    const impulse = new Vector3(0, 0, 0)
      .subtract(throwTarget)
      .normalizeToNew()
      .scale(lerp(600, 900, Math.random()))

    // mesh.physicsImpostor.disableBidirectionalTransformation = true
    mesh.physicsImpostor.setLinearVelocity(Vector3.Zero())
    mesh.physicsImpostor.setAngularVelocity(Vector3.Zero())
    mesh.physicsImpostor.applyImpulse(
      impulse,
      mesh.physicsImpostor.getObjectCenter()
    )
    
    return new Promise((resolve,reject) => {
      return die.registerNewListener(val => resolve(val))
    })
  }

  static getRollResult(die) {
    const getDieRoll = (die) => {
      let highestDot = -1
      let highestLocator
      for (let locator of die.mesh._children[0].getChildTransformNodes()) {
        // let dif = locator
        //   .getAbsolutePosition()
          // .subtract(die.mesh.getAbsolutePosition())
        // let direction = dif.normalize()
        // const dot = Vector3.Dot(direction, Vector3.Up())
        const dot = Vector3.Dot(locator.getAbsolutePosition(), Vector3.Up())
        if (dot > highestDot) {
          highestDot = dot
          highestLocator = locator
        }
      }
      return parseInt(highestLocator.name.slice(highestLocator.name.lastIndexOf('_')+1));
    }

    let number

    // If the dice is a d100 add the d10
    if(die.dieType === 'd100') {
      number = die.d10Instance.then(result => {
        const d100Result = getDieRoll(die)
        // Both zero set to 100
        if (result === 0 && d100Result === 0) {
          return 100;
        } else {
          return d100Result + result
        }
      })
    } else {
      number = getDieRoll(die)
    }

    return number

  }

  static getDieSpeed(die) {
    const impostor = die.mesh.physicsImpostor
    const dieSpeed = impostor
      .getLinearVelocity()
      .length();
    // If the die is a d100 check the d10 as well
    // if (die.type === "d100") {
    //   const d10Speed = die.d10Instance.physicsImpostor
    //     .getLinearVelocity()
    //     .length();
    //   return Math.max(dieSpeed, d10Speed);
    // } else {
      return dieSpeed;
    // }
  }

  static isAsleep(die) {
    // console.log(`this`, this)
    // const die = this
    if(die.asleep) {
      return
    }
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

    // console.log(`die`, die)
    // console.log(`parent impostor`, impostor)
    // console.log(`parent isActive`, impostor.physicsBody.isActive())
    const speed = Dice.getDieSpeed(die)
    // console.log(`speed`, speed)
    if(speed < .01 && !die.sleepTimeout) {
      die.sleepTimeout = setTimeout(()=>{
        // die.mesh.physicsImpostor.physicsBody.setCollisionFlags(0)
        // die.mesh.physicsImpostor.physicsBody.forceActivationState(3)
        // die.mesh.physicsImpostor.setLinearVelocity(Vector3.Zero());
        // die.mesh.physicsImpostor.setAngularVelocity(Vector3.Zero());
        // die.mesh.physicsImpostor.setMass(0);
        die.mesh.physicsImpostor.forceUpdate();
        // console.log(`die.mesh`, die.mesh)
        die.asleep = true
        die.result = Dice.getRollResult(die)
      }, 1000)
      die.mesh.physicsImpostor.physicsBody.forceActivationState(3)
      die.mesh.physicsImpostor.setLinearVelocity(Vector3.Zero());
      die.mesh.physicsImpostor.setAngularVelocity(Vector3.Zero());
      console.log(Date.now(),die.mesh)
      // die.mesh.physicsImpostor.physicsBody.setActivationState(5);
      console.log("mass",die.mesh.physicsImpostor.mass)
      die.mesh.physicsImpostor.setMass(0)
      // die.mesh.physicsImpostor.forceUpdate();
      // console.log(`die.mesh`, die.mesh)
      // die.result = Dice.getRollResult(die)
    }
  }
}

export default Dice