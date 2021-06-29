// import { Color3, MeshBuilder, PhysicsImpostor, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { BoxBuilder } from '@babylonjs/core/Meshes/Builders/boxBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShadowOnlyMaterial } from '@babylonjs/materials/shadowOnly/shadowOnlyMaterial'

function createDiceBox(dimensions = {size: 6, w: 300, h: 150}, canvas, options = {}) {

  dimensions.w = dimensions.w | canvas.width
  dimensions.h = dimensions.h | canvas.height
  const aspect = dimensions.w / dimensions.h
  const diceBox = new TransformNode("diceBox");
  const wallHeight = 30
  let boxMaterial = null
  let boxMaterial2 = null
  let ground2 = null

  if(options.enableDebugging) {
    boxMaterial = new StandardMaterial("diceBox_material")
    boxMaterial.alpha = .1
    boxMaterial.diffuseColor = new Color3(1, 1, 0);
  }
  else {
    if(options.enableShadows) {
      boxMaterial = new ShadowOnlyMaterial('shadowOnly')
      boxMaterial.alpha = .1
      boxMaterial.diffuseColor = new Color3(1, 1, 1)
      
      if(options.usePointLights){

        boxMaterial.activeLight = options.lights.point1
      
        boxMaterial2 = new ShadowOnlyMaterial('shadowOnly2')
        boxMaterial2.alpha = .1
        boxMaterial2.diffuseColor = new Color3(1, 1, 1)
        boxMaterial2.activeLight = options.lights.point2
      } else {
        boxMaterial.activeLight = options.lights.directional
      }
    }
  }

  // Bottom of the Box
  const ground = BoxBuilder.CreateBox("ground",{
    width: dimensions.size, 
    height: 1,
    depth: dimensions.size
  })
  // ground.rotation.x = Math.PI / 2
  // ground.rotation.y = Math.PI
  ground.scaling = new Vector3(aspect, 1, 1)
  ground.material = boxMaterial
  ground.receiveShadows = true
  // ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor,{ mass: 0, friction: 1 })
  ground.setParent(diceBox)

  if(options.enableShadows && options.usePointLights && !options.enableDebugging) {
    ground2 = ground.clone("ground2")
    ground2.material = boxMaterial2
    ground2.position.y = -.1
    ground2.setParent(diceBox)
  }

  // Top or North Wall
  const wallTop = BoxBuilder.CreateBox("wallTop",{
    width: dimensions.size,
    height: wallHeight,
    depth: 1
  })
  wallTop.position.y = wallHeight / 2
  wallTop.position.z = dimensions.size / -2
  // wallTop.rotation.y = Math.PI
  wallTop.scaling = new Vector3(aspect, 1, 1)
  wallTop.material = boxMaterial
  wallTop.receiveShadows = true
  // wallTop.physicsImpostor = new PhysicsImpostor(wallTop, PhysicsImpostor.BoxImpostor,{ mass: 0, friction: 1 })
  wallTop.setParent(diceBox)

  // Right Wall
  const wallRight = BoxBuilder.CreateBox("wallRight",{
    width: 1, 
    height: wallHeight,
    depth: dimensions.size
  })
  wallRight.position.x = dimensions.size * aspect / 2
  wallRight.position.y = wallHeight / 2
  // wallRight.rotation.y = Math.PI / 2
  wallRight.material = boxMaterial
  wallRight.receiveShadows = true
  // wallRight.physicsImpostor = new PhysicsImpostor(wallRight, PhysicsImpostor.BoxImpostor,{ mass: 0, friction: 1 })
  wallRight.setParent(diceBox)

  // Bottom or South Wall
  const wallBottom = BoxBuilder.CreateBox("wallBottom",{
    width: dimensions.size, 
    height: wallHeight,
    depth: 1
  })
  wallBottom.position.y = wallHeight / 2
  wallBottom.position.z = dimensions.size / 2
  wallBottom.scaling = new Vector3(aspect, 1, 1)
  wallBottom.material = boxMaterial
  wallBottom.receiveShadows = true
  // wallBottom.physicsImpostor = new PhysicsImpostor(wallBottom, PhysicsImpostor.BoxImpostor,{ mass: 0, friction: 1 })
  wallBottom.setParent(diceBox)

  // Left Wall
  const wallLeft = BoxBuilder.CreateBox("wallLeft",{
    width: 1, 
    height: wallHeight,
    depth: dimensions.size
  })
  wallLeft.position.x = dimensions.size * aspect / -2
  wallLeft.position.y = wallHeight / 2
  // wallLeft.rotation.y = Math.PI * 1.5
  wallLeft.material = boxMaterial
  wallLeft.receiveShadows = true
  // wallLeft.physicsImpostor = new PhysicsImpostor(wallLeft, PhysicsImpostor.BoxImpostor,{ mass: 0, friction: 1 })
  wallLeft.setParent(diceBox)

  // top of the Box
  // const ceiling = BoxBuilder.CreateBox("ceiling",{
  //   width: dimensions.size, 
  //   height: 1,
  //   depth: dimensions.size
  // })
  // ceiling.position.y = wallHeight
  // ceiling.scaling = new Vector3(aspect, 1, 1)
  // ceiling.material = boxMaterial
  // ceiling.isVisible = false
  // ceiling.receiveShadows = true
  // ceiling.physicsImpostor = new PhysicsImpostor(ceiling, PhysicsImpostor.BoxImpostor,{ mass: 0, friction: 1 })
  // ceiling.setParent(diceBox)
    
  // Watch for browser/canvas resize events
  // TODO: Debounce resize event
  // TODO: Animate changes so objects inside the diceBox are not lost
  // if(!options.enableDebugging && !options.enableShadows) {
  //   ground.isVisible = false
  //   wallTop.isVisible = false
  //   wallRight.isVisible = false
  //   wallBottom.isVisible = false
  //   wallLeft.isVisible = false
  //   // ceiling.isVisible = false
  // }

  return diceBox
} 

export { createDiceBox }