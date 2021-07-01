var Module = { TOTAL_MEMORY: 256 * 1024 * 1024 }
import * as AmmoJS from "ammo.js/builds/ammo.wasm.js";
import { lerp } from '../../helpers'

const config = {
  locateFile: () => '../../assets/ammo/ammo.wasm.wasm'
}

// there's probably a better place for these variables
let bodies = []
let sleepingBodies = []
let colliders = {}
let last = new Date().getTime()
let physicsWorld
let size = 20
let width = 50
let height = 50
let aspect = 1
let Ammo
let worldWorkerPort
let tmpBtTrans
let runTime = 15000
let stopLoop = false
let startPosition = [0,15,0]
let spinForce = 20
let throwForce = 20
let sharedVector3


// const buffer = new ArrayBuffer(1024 * 1024 * 10) // reserves 10 MB
// let bufferData = new Float64Array(buffer) // view the buffer as bytes

self.onmessage = (e) => {
  // console.log('worker event', e)
  // console.log("physicsWorker got message:", e.data.action)
  switch (e.data.action) {
    case "rollDie":
      rollDie(e.data.die)
      break;
    case "init":
      width = e.data.width
      height = e.data.height
      size = 35
      aspect = width / height
      init().then(()=>{
        // console.log("physics init complete")
        self.postMessage({
          action:"init-complete"
        })
      })
      break
    case "clearDice":
      // clear all bodies
      stopLoop = true
      bodies.forEach(body => physicsWorld.removeRigidBody(body))
      sleepingBodies.forEach(body => physicsWorld.removeRigidBody(body))
      bodies = []
      sleepingBodies = []
      // restart the simulation loop
      stopLoop = false
      loop()
      break
    case "connect":
      // console.log("connecting to port", e.ports[0])
      worldWorkerPort = e.ports[0]
      worldWorkerPort.onmessage = (e) => {
        // console.log(`e`, e)
        switch (e.data.action) {
          case "addDie":
            // console.log("adding physics die", e.data.die)
            addDie(e.data.die, e.data.id)
            break;
          case "rollDie":
            rollDie(e.data.die)
            break;
          case "stopSimulation":
            stopLoop = true
            break;
          default:
            console.error("action not found in physics worker from worldOffscreen worker:", e.data.action)
        }
      }
      break
    default:
      console.error("action not found in physics worker:", e.data.action)
  }
}

  // setTimeout(()=>{
  //   // bodies.forEach(rb => {
  //   //   console.log(`rb`, rb)
  //   //   const state = rb.isActive()
  //   //   console.log(`isActive`, state)
  //   //   console.log("motionState",rb.getMotionState())
  //   // })
  //   stopLoop = true
  // }, runTime)

  // runs when the worker loads to set up the Ammo physics world and load our colliders
  // loaded colliders will be cached and added to the world in a later post message
  const init = async () => {
      // console.log("running init")

      Ammo = await new AmmoJS(config)

      tmpBtTrans = new Ammo.btTransform()
      sharedVector3 = new Ammo.btVector3(0, 0, 0)
      
      // load our collider data
      // perhaps we don't await this, let it run and resolve it later
      const modelData = await fetch('../../assets/models/diceColliders.json').then(resp => {
        if(resp.ok) {
          const contentType = resp.headers.get("content-type")
  
          if (contentType && contentType.indexOf("application/json") !== -1) {
            return resp.json()
          } 
          else if (resp.type && resp.type === 'basic') {
            return resp.json()
          }
          else {
            return resp
          }
        } else {
          throw new Error(`Request rejected with status ${resp.status}: ${resp.statusText}`)
        }
      })
      .then(data => {
        return data.meshes
      })
      .catch(error => {
        console.error(error)
        return error
      })
      
      physicsWorld = setupPhysicsWorld()

      // turn our model data into convex hull items for the physics world
      modelData.forEach((model,i) => {
        model.convexHull = createConvexHull(model)
        // model.physicsBody = createRigidBody(model.convexHull, {mass: model.mass})

        colliders[model.id] = model
      })

      const box = addBoxToWorld()

      loop()
  
  }

  const setVector3 = (x,y,z) => {
    sharedVector3.setValue(x,y,z)
    return sharedVector3
  }

  const createConvexHull = (mesh) => {
    const convexMesh = new Ammo.btConvexHullShape()

    let count = mesh.positions.length

    for (let i = 0; i < count; i+=3) {
      let v = setVector3(mesh.positions[i], mesh.positions[i+1], mesh.positions[i+2])
      convexMesh.addPoint(v, true)
    }

    convexMesh.setLocalScaling(setVector3(-mesh.scaling[0],mesh.scaling[1],-mesh.scaling[2]))

    return convexMesh
  }

  const createRigidBody = (collisionShape, params) => {
    // apply params
    const {
      mass = 10,
      collisionFlags = 0,
      // pos = { x: 0, y: 0, z: 0 },
      // quat = { x: 0, y: 0, z: 0, w: 1 }
      pos = [0,0,0],
      quat = [0,0,0,-1],
      scale = [1,1,1],
      friction = .9,
      restitution = .2
    } = params

    // apply position and rotation
    const transform = new Ammo.btTransform()
    // console.log(`collisionShape scaling `, collisionShape.getLocalScaling().x(),collisionShape.getLocalScaling().y(),collisionShape.getLocalScaling().z())
    transform.setIdentity()
    transform.setOrigin(setVector3(pos[0], pos[1], pos[2]))
    transform.setRotation(
      new Ammo.btQuaternion(quat[0], quat[1], quat[2], quat[3])
    )
    // collisionShape.setLocalScaling(new Ammo.btVector3(1.1, -1.1, 1.1))
    // transform.ScalingToRef()

    // create the rigid body
    const motionState = new Ammo.btDefaultMotionState(transform)
    const localInertia = setVector3(0, 0, 0)
    if (mass > 0) collisionShape.calculateLocalInertia(mass, localInertia)
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      collisionShape,
      localInertia
    )
    const rigidBody = new Ammo.btRigidBody(rbInfo)
    // console.log(`rigidBody`, rigidBody)
    
    // rigid body properties
    if (mass > 0) rigidBody.setActivationState(4) // Disable deactivation
    rigidBody.setCollisionFlags(collisionFlags)
    rigidBody.setFriction(friction)
    rigidBody.setRestitution(restitution)

    // ad rigid body to physics world
    // physicsWorld.addRigidBody(rigidBody)

    return rigidBody

  }

  const addBoxToWorld = () => {
    // ground
    const localInertia = setVector3(0, 0, 0);
    const groundTransform = new Ammo.btTransform()
    groundTransform.setIdentity()
    groundTransform.setOrigin(setVector3(0, -.5, 0))
    const groundShape = new Ammo.btBoxShape(setVector3(size * aspect, 1, size))
    const groundMotionState = new Ammo.btDefaultMotionState(groundTransform)
    const groundInfo = new Ammo.btRigidBodyConstructionInfo(0, groundMotionState, groundShape, localInertia)
    const groundBody = new Ammo.btRigidBody(groundInfo)
    groundBody.setFriction(1)
    groundBody.setRestitution(0.2)
    physicsWorld.addRigidBody(groundBody)

    const wallTopTransform = new Ammo.btTransform()
    wallTopTransform.setIdentity()
    wallTopTransform.setOrigin(setVector3(0, 0, size/-2))
    const wallTopShape = new Ammo.btBoxShape(setVector3(size * aspect, size, 1))
    const topMotionState = new Ammo.btDefaultMotionState(wallTopTransform)
    const topInfo = new Ammo.btRigidBodyConstructionInfo(0, topMotionState, wallTopShape, localInertia)
    const topBody = new Ammo.btRigidBody(topInfo)
    topBody.setFriction(1)
    topBody.setRestitution(0.2)
    physicsWorld.addRigidBody(topBody)

    const wallBottomTransform = new Ammo.btTransform()
    wallBottomTransform.setIdentity()
    wallBottomTransform.setOrigin(setVector3(0, 0, size/2))
    const wallBottomShape = new Ammo.btBoxShape(setVector3(size * aspect, size, 1))
    const bottomMotionState = new Ammo.btDefaultMotionState(wallBottomTransform)
    const bottomInfo = new Ammo.btRigidBodyConstructionInfo(0, bottomMotionState, wallBottomShape, localInertia)
    const bottomBody = new Ammo.btRigidBody(bottomInfo)
    bottomBody.setFriction(1)
    bottomBody.setRestitution(0.2)
    physicsWorld.addRigidBody(bottomBody)

    const wallRightTransform = new Ammo.btTransform()
    wallRightTransform.setIdentity()
    wallRightTransform.setOrigin(setVector3(size * aspect / -2, 0, 0))
    const wallRightShape = new Ammo.btBoxShape(setVector3(1, size, size))
    const rightMotionState = new Ammo.btDefaultMotionState(wallRightTransform)
    const rightInfo = new Ammo.btRigidBodyConstructionInfo(0, rightMotionState, wallRightShape, localInertia)
    const rightBody = new Ammo.btRigidBody(rightInfo)
    rightBody.setFriction(1)
    rightBody.setRestitution(0.2)
    physicsWorld.addRigidBody(rightBody)

    const wallLeftTransform = new Ammo.btTransform()
    wallLeftTransform.setIdentity()
    wallLeftTransform.setOrigin(setVector3(size * aspect / 2, 0, 0))
    const wallLeftShape = new Ammo.btBoxShape(setVector3(1, size, size))
    const leftMotionState = new Ammo.btDefaultMotionState(wallLeftTransform)
    const leftInfo = new Ammo.btRigidBodyConstructionInfo(0, leftMotionState, wallLeftShape, localInertia)
    const leftBody = new Ammo.btRigidBody(leftInfo)
    leftBody.setFriction(1)
    leftBody.setRestitution(0.2)
    physicsWorld.addRigidBody(leftBody)
  }

  const addDie = (type, id) => {
    // console.log(`type`, type)
    let cType = type.replace('d','c')
    cType = cType.replace('100','10')
    // clone the collider
    const newDie = createRigidBody(colliders[cType].convexHull, {
      mass: colliders[cType].physicsMass,
      scaling: colliders[cType].scaling,
      pos: startPosition,
      quat: colliders[cType].rotationQuaternion,
    })
    newDie.id = id
    physicsWorld.addRigidBody(newDie)
    bodies.push(newDie)
    // console.log(`added collider for `, type)
    rollDie(newDie)
  }

  const rollDie = (die) => {
    // const magicNumber = 54.057142857
    // const maxWorldX = width/magicNumber
    // const maxWorldZ = height/magicNumber
    // console.log(`bounds`, maxWorldX,maxWorldZ)
    // const throwTarget = new Vector3(
    //   lerp(maxWorldX, -maxWorldX, Math.random()),
    //   -5,
    //   lerp(maxWorldZ, -maxWorldZ, Math.random())
    // );

    // const impulse = new Vector3(Math.random(),Math.random(),Math.random())
    //   .subtract(throwTarget)
    //   .normalizeToNew()
    //   // .scale(lerp(-60, 120, Math.random()))
    //   .scale(25)
    // die.applyImpulse(force, die.getWorldTransform().getOrigin())

    const force = new Ammo.btVector3(
      lerp(-spinForce, spinForce, Math.random()),
      lerp(-spinForce, spinForce, Math.random()),
      lerp(-spinForce, spinForce, Math.random())
    )

    // console.log(`force`, force.x(), force.y(), force.z())
    
    die.applyImpulse(force, setVector3(4,4,4))

    die.setLinearVelocity(setVector3(
      lerp(-throwForce*aspect, throwForce*aspect, Math.random()),
      lerp(-throwForce, 0, Math.random()),
      lerp(-throwForce, throwForce, Math.random())
    ))

  }
  

  const setupPhysicsWorld = () => {
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration()
    const broadphase = new Ammo.btDbvtBroadphase()
    const solver = new Ammo.btSequentialImpulseConstraintSolver()
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration)
    const World = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfiguration
    )
    World.setGravity(setVector3(0, -9.81 * 3, 0))
  
    return World
  }

  const update = (delta) => {
    let movements = []
    let asleep = []
    const emptyVector = setVector3(0,0,0)

    // step world
    const deltaTime = delta / 1000
    physicsWorld.stepSimulation(deltaTime, 1, 1 / 60)

    for (let i = 0, len = bodies.length; i < len; i++) {
      const rb = bodies[i]
      const speed = rb.getLinearVelocity().length()
      const tilt = rb.getAngularVelocity().length()
      if(speed < .01 && tilt < .001) {
        rb.asleep = true
        rb.setMassProps(0)
        rb.forceActivationState(3)
        // zero out anything left
        rb.setLinearVelocity(emptyVector)
        rb.setAngularVelocity(emptyVector)
        asleep.push(i)
        continue
      }
      const ms = rb.getMotionState()
      if (ms) {
        ms.getWorldTransform(tmpBtTrans)
        let p = tmpBtTrans.getOrigin()
        let q = tmpBtTrans.getRotation()
        movements.push([
          parseFloat(p.x().toFixed(4)),
          parseFloat(p.y().toFixed(4)),
          parseFloat(p.z().toFixed(4)),
          parseFloat(q.x().toFixed(4)),
          parseFloat(q.y().toFixed(4)),
          parseFloat(q.z().toFixed(4)),
          parseFloat(q.w().toFixed(4)),
          rb.id
        ])
      }
    }

    // this must be a reverse loop so it does not alter the array index numbers
    for (let i = asleep.length - 1; i >= 0; i--) {
      sleepingBodies.push(bodies.splice(asleep[i],1)[0])
    }

    return {movements, asleep}
  }

  const loop = () => {
    let now = new Date().getTime()
    const delta = now - last
    last = now

    const updates = update(delta)
    worldWorkerPort.postMessage({ action: 'updates', updates })

    if(!stopLoop) {
      requestAnimationFrame(loop)
    }
  }
