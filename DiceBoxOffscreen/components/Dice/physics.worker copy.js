var Module = { TOTAL_MEMORY: 256 * 1024 * 1024 }
//importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");
// importScripts('/ammo/ammo.wasm.js')
// import Ammo from '../../assets/ammo/ammo.wasm.js'
import * as Ammo from "ammo.js/builds/ammo.wasm.js";
import { Quaternion, Vector3, Matrix } from "@babylonjs/core/Maths/math.vector";
import { lerp } from '../../helpers'


// init - set up physics world
// loadMesh - load up our meshes. All at once please
// roll - apply impulse and start animation loop
// postMessage on sleep - see Dice.js
// step - get object position and rotation


var config = {
  locateFile: () => '../../assets/ammo/ammo.wasm.wasm'
}

// there's probably a better place for these variables
let bodies = []
let colliders = {}
let last = new Date().getTime()
let physicsWorld
let size = 20
let width = 50
let height = 50
let aspect = 1
let worldWorkerPort

self.onmessage = (e) => {
  console.log(`e`, e)
}


new Ammo(config).then(Ammo => {

  self.onmessage = (e) => {
    // console.log('worker event', e)
    console.log("getting physics started")
    switch (e.data.action) {
      case "addDie":
        addDie(e.data.dieType)
        break;
      case "rollDie":
        rollDie(e.data.dieType)
        break;
      case "init":
        width = e.data.width
        height = e.data.height
        size = 35
        aspect = width / height
        init().then(()=>{
          console.log("physics init complete")
          self.postMessage({
            action:"init-complete"
          })
        })
      case "connect":
        console.log("connecting to port", e.ports[0])
        worldWorkerPort = e.ports[0]
      default:
        console.error("action not found in physics worker")
    }
  }

  let tmpBtTrans = new Ammo.btTransform()
  let stopLoop = false

  setTimeout(()=>{
    stopLoop = true
  },15000)

  // runs when the worker loads to set up the Ammo physics world and load our colliders
  // loaded colliders will be cached and added to the world in a later post message
  const init = async () => {
    return new Promise( async resolve => {
      console.log("running init")
      
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
  
      console.log("Let's work!")
      
      physicsWorld = setupPhysicsWorld()

      // set up the ground - todo: need to get width and height from main thread and pass resize messages to the world
      const ground = new Ammo.btBoxShape(new Ammo.btVector3(50, 1, 50));

      // turn our model data into convex hull items for the physics world
      modelData.forEach((model,i) => {
        model.convexHull = createConvexHull(model)
        // model.physicsBody = createRigidBody(model.convexHull, {mass: model.mass})

        colliders[model.id] = model
      })

      console.log(`colliders`, colliders)
      // console.log(`Ammo.btVector3`, new Ammo.btVector3(0, 0, 0))

      // const groud = addGroundToWorld()
      const box = addBoxToWorld()
      physicsWorld.addRigidBody(ground)

      loop()

      // setTimeout(()=>{
      //   stopLoop = true
      // }, 8000)
  
  
      resolve()
  
    })
  }

  // create d20 test collider
  // create impulse
  // create animation loop
  // post message back to main thread to animate d20 mesh
  


  const createConvexHull = (mesh) => {
    const convexMesh = new Ammo.btConvexHullShape()

    const tmpMatrix = new Matrix()

    // mesh.positions.forEach(point => convexMesh.addPoint(point))
    // let faceCount = mesh.indices.length / 3;
    // const tmpAmmoVectorA = new Ammo.btVector3(0,0,0)
    // const tmpAmmoVectorB = new Ammo.btVector3(0,0,0)
    // const tmpAmmoVectorC = new Ammo.btVector3(0,0,0)

    // for (let i = 0; i < faceCount; i++) {
    //   // let triangleCount = 0
    //   // let triPoints = [];
    //   for (let point = 0; point < 3; point++) {
    //     let v = new Ammo.btVector3(mesh.positions[(mesh.indices[(i * 3) + point] * 3) + 0], mesh.positions[(mesh.indices[(i * 3) + point] * 3) + 1], mesh.positions[(mesh.indices[(i * 3) + point] * 3) + 2]);
    //     // console.log("point",(mesh.indices[(i * 3) + point] * 3) + 0)
    //     // triPoints.push(v);
    //     // let vec = new Ammo.btVector3(v.x, v.y, v.z)
    //     // Adjust for initial scaling
    //     Matrix.ScalingToRef(mesh.scaling[0], mesh.scaling[1], mesh.scaling[2], tmpMatrix);
    //     v = Vector3.TransformCoordinates(v, tmpMatrix);
    //     let vec
    //     if (point == 0) {
    //       vec = tmpAmmoVectorA;
    //     }
    //     else if (point == 1) {
    //       vec = tmpAmmoVectorB;
    //     }
    //     else {
    //       vec = tmpAmmoVectorC;
    //     }
    //     // vec.setValue(v.x, v.y, v.z);
    //     // triPoints.push(vec);
    //     convexMesh.addPoint(vec, true)
        
    //   }
    //   // convexMesh.addPoint(triPoints[0], true);
    //   // convexMesh.addPoint(triPoints[1], true);
    //   // convexMesh.addPoint(triPoints[2], true);
    //   // triangleCount++;
    // }

    let count = mesh.positions.length

    for (let i = 0; i < count; i+=3) {
      let v = new Ammo.btVector3(-mesh.positions[i], mesh.positions[i+1], -mesh.positions[i+2])
      convexMesh.addPoint(v, true)
    }

    convexMesh.setLocalScaling(new Ammo.btVector3(mesh.scaling[0],mesh.scaling[1],mesh.scaling[2]))

    return convexMesh
  }

  const createRigidBody = (collisionShape, params) => {
    // apply params
    const {
      mass = 1,
      collisionFlags = 0,
      // pos = { x: 0, y: 0, z: 0 },
      // quat = { x: 0, y: 0, z: 0, w: 1 }
      pos = [0,0,0],
      quat = [0,0,0,-1],
      scale = [1,1,1],
      friction = 1,
      restitution = 0.4
    } = params

    // apply position and rotation
    const transform = new Ammo.btTransform()
    transform.setIdentity()
    transform.setOrigin(new Ammo.btVector3(pos[0], pos[1], pos[2]))
    transform.setRotation(
      new Ammo.btQuaternion(quat[0], quat[1], quat[2], quat[3])
    )
    // transform.ScalingToRef()

    // create the rigid body
    const motionState = new Ammo.btDefaultMotionState(transform)
    const localInertia = new Ammo.btVector3(0, 0, 0)
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

  const addGroundToWorld = (width,height) => {
    const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(size, 1, size));
    const groundTransform = new Ammo.btTransform();
    const mass = 0;
    const localInertia = new Ammo.btVector3(0, 0, 0);
    groundTransform.setIdentity();
    groundTransform.setOrigin(new Ammo.btVector3(0, -1, 0));
    const myMotionState = new Ammo.btDefaultMotionState(groundTransform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, myMotionState, groundShape, localInertia);
    const body = new Ammo.btRigidBody(rbInfo);
    body.setFriction(1)
    body.setRestitution(0.2)

    physicsWorld.addRigidBody(body);
  }

  const addBoxToWorld = () => {
    // ground
    const localInertia = new Ammo.btVector3(0, 0, 0);
    const groundTransform = new Ammo.btTransform()
    groundTransform.setIdentity()
    groundTransform.setOrigin(new Ammo.btVector3(0, -.5, 0))
    const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(size * aspect, 1, size))
    const groundMotionState = new Ammo.btDefaultMotionState(groundTransform)
    const groundInfo = new Ammo.btRigidBodyConstructionInfo(0, groundMotionState, groundShape, localInertia)
    const groundBody = new Ammo.btRigidBody(groundInfo)
    groundBody.setFriction(1)
    groundBody.setRestitution(0.2)
    physicsWorld.addRigidBody(groundBody)

    const wallTopTransform = new Ammo.btTransform()
    wallTopTransform.setIdentity()
    wallTopTransform.setOrigin(new Ammo.btVector3(0, 0, size/-2))
    const wallTopShape = new Ammo.btBoxShape(new Ammo.btVector3(size * aspect, size, 1))
    const topMotionState = new Ammo.btDefaultMotionState(wallTopTransform)
    const topInfo = new Ammo.btRigidBodyConstructionInfo(0, topMotionState, wallTopShape, localInertia)
    const topBody = new Ammo.btRigidBody(topInfo)
    topBody.setFriction(1)
    topBody.setRestitution(0.2)
    physicsWorld.addRigidBody(topBody)

    const wallBottomTransform = new Ammo.btTransform()
    wallBottomTransform.setIdentity()
    wallBottomTransform.setOrigin(new Ammo.btVector3(0, 0, size/2))
    const wallBottomShape = new Ammo.btBoxShape(new Ammo.btVector3(size * aspect, size, 1))
    const bottomMotionState = new Ammo.btDefaultMotionState(wallBottomTransform)
    const bottomInfo = new Ammo.btRigidBodyConstructionInfo(0, bottomMotionState, wallBottomShape, localInertia)
    const bottomBody = new Ammo.btRigidBody(bottomInfo)
    bottomBody.setFriction(1)
    bottomBody.setRestitution(0.2)
    physicsWorld.addRigidBody(bottomBody)

    const wallRightTransform = new Ammo.btTransform()
    wallRightTransform.setIdentity()
    wallRightTransform.setOrigin(new Ammo.btVector3(size * aspect / -2, 0, 0))
    const wallRightShape = new Ammo.btBoxShape(new Ammo.btVector3(1, size, size))
    const rightMotionState = new Ammo.btDefaultMotionState(wallRightTransform)
    const rightInfo = new Ammo.btRigidBodyConstructionInfo(0, rightMotionState, wallRightShape, localInertia)
    const rightBody = new Ammo.btRigidBody(rightInfo)
    rightBody.setFriction(1)
    rightBody.setRestitution(0.2)
    physicsWorld.addRigidBody(rightBody)

    const wallLeftTransform = new Ammo.btTransform()
    wallLeftTransform.setIdentity()
    wallLeftTransform.setOrigin(new Ammo.btVector3(size * aspect / 2, 0, 0))
    const wallLeftShape = new Ammo.btBoxShape(new Ammo.btVector3(1, size, size))
    const leftMotionState = new Ammo.btDefaultMotionState(wallLeftTransform)
    const leftInfo = new Ammo.btRigidBodyConstructionInfo(0, leftMotionState, wallLeftShape, localInertia)
    const leftBody = new Ammo.btRigidBody(leftInfo)
    leftBody.setFriction(1)
    leftBody.setRestitution(0.2)
    physicsWorld.addRigidBody(leftBody)



  }

  const addDie = (type) => {
    const cType = type.replace('d','c')
    // clone the collider
    const newDie = createRigidBody(colliders[cType].convexHull, {
      mass: colliders[cType].physicsMass,
      scaling: colliders[cType].scaling,
      pos: [0,12,0],
      quat: colliders[cType].rotationQuaternion,
    })
    physicsWorld.addRigidBody(newDie)
    bodies.push(newDie)
    // console.log(`added collider for `, type)
    // rollDie(newDie)
  }

  const rollDie = (die) => {
    // console.log(`width`, width)
    // console.log(`height`, height)
    const magicNumber = 54.057142857
    const maxWorldX = width/magicNumber
    const maxWorldZ = height/magicNumber
    // console.log(`bounds`, maxWorldX,maxWorldZ)
    const throwTarget = new Vector3(
      lerp(maxWorldX, -maxWorldX, Math.random()),
      5,
      lerp(maxWorldZ, -maxWorldZ, Math.random())
    );

    // console.log(`throwTarget`, throwTarget)

    const impulse = new Vector3(Math.random(),Math.random(),Math.random())
      .subtract(throwTarget)
      .normalizeToNew()
      // .scale(lerp(-60, 120, Math.random()))
      .scale(30)

    // console.log(`impulse`, impulse)

    // console.log(`die`, die)
    const origin = die.getWorldTransform().getOrigin()
    // console.log(`die world transform`, origin.x(), origin.y(), origin.z())

    const force = new Ammo.btVector3(impulse.x, impulse.y, impulse.z)
    die.applyImpulse(force, die.getWorldTransform().getOrigin())
    die.setLinearVelocity(new Ammo.btVector3(
      lerp(-15, 15, Math.random()),
      lerp(-15, 0, Math.random()),
      lerp(-15, 15, Math.random())
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
    World.setGravity(new Ammo.btVector3(0, -9.81 * 2, 0))
  
    return World
  }

  const update = (delta) => {
    let updates = []

    // step world
    const deltaTime = delta / 1000
    physicsWorld.stepSimulation(deltaTime, 1, 1 / 60)

    bodies.forEach(rb => {
      const ms = rb.getMotionState()
      if (ms) {
        ms.getWorldTransform(tmpBtTrans)
        let p = tmpBtTrans.getOrigin()
        let q = tmpBtTrans.getRotation()
        updates.push(
          parseFloat(p.x().toFixed(4)),
          parseFloat(p.y().toFixed(4)),
          parseFloat(p.z().toFixed(4)),
          parseFloat(q.x().toFixed(4)),
          parseFloat(q.y().toFixed(4)),
          parseFloat(q.z().toFixed(4)),
          parseFloat(q.w().toFixed(4))
        )
      }
    })

    return updates
  }

  const loop = () => {
    // console.log("looper duper")
    let now = new Date().getTime()
    const delta = now - last
    last = now

    const updates = update(delta)

    self.postMessage({ msg: 'updates', updates })

    if(!stopLoop) {
      requestAnimationFrame(loop)
    }
  }

  // kick off physics world setup
  // init()

})


