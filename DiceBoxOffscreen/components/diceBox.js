// import { Color3, BoxBuilder, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { BoxBuilder } from '@babylonjs/core/Meshes/Builders/boxBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShadowOnlyMaterial } from '@babylonjs/materials/shadowOnly/shadowOnlyMaterial'

const defaultOptions = {
  size: 6,
  aspect: 300 / 150,
  enableDebugging: false,
  enableShadows: true,
	zoomLevel: 0
}
let zoom = [43,37,32,26.5,23,20.5,18,15.75]

// cache the walls for resizing
let diceBox, boxMaterial = null

function createDiceBox(options = defaultOptions) {

	if(diceBox) {
		diceBox.dispose()
	}

  const { aspect, zoomLevel, enableDebugging, lights, enableShadows } = options
  const wallHeight = 30
	const size = zoom[zoomLevel]

  diceBox = new TransformNode("diceBox");

  if(enableDebugging) {
    boxMaterial = new StandardMaterial("diceBox_material")
    boxMaterial.alpha = .7
    boxMaterial.diffuseColor = new Color3(1, 1, 0);
  }
  else {
    if(enableShadows) {
      boxMaterial = new ShadowOnlyMaterial('shadowOnly')
      // boxMaterial.alpha = .3
      // boxMaterial.diffuseColor = new Color3(1, 1, 1)
      // boxMaterial.activeLight = lights.directional
    }
  }

  // Bottom of the Box
  const ground = BoxBuilder.CreateBox("ground",{
    width: size, 
    height: 1,
    depth: size
  })
  ground.scaling = new Vector3(aspect, 1, 1)
  ground.material = boxMaterial
  ground.receiveShadows = true
  ground.setParent(diceBox)

  // North Wall
  const wallTop = BoxBuilder.CreateBox("wallTop",{
    width: size,
    height: wallHeight,
    depth: 1
  })
  wallTop.position.y = wallHeight / 2
  wallTop.position.z = size / -2
  wallTop.scaling = new Vector3(aspect, 1, 1)
  wallTop.material = boxMaterial
  wallTop.receiveShadows = true
  wallTop.setParent(diceBox)

  // Right Wall
  const wallRight = BoxBuilder.CreateBox("wallRight",{
    width: 1, 
    height: wallHeight,
    depth: size
  })
  wallRight.position.x = size * aspect / 2
  wallRight.position.y = wallHeight / 2
  wallRight.material = boxMaterial
  wallRight.receiveShadows = true
  wallRight.setParent(diceBox)

  // South Wall
  const wallBottom = BoxBuilder.CreateBox("wallBottom",{
    width: size, 
    height: wallHeight,
    depth: 1
  })
  wallBottom.position.y = wallHeight / 2
  wallBottom.position.z = size / 2
  wallBottom.scaling = new Vector3(aspect, 1, 1)
  wallBottom.material = boxMaterial
  wallBottom.receiveShadows = true
  wallBottom.setParent(diceBox)

  // Left Wall
  const wallLeft = BoxBuilder.CreateBox("wallLeft",{
    width: 1, 
    height: wallHeight,
    depth: size
  })
  wallLeft.position.x = size * aspect / -2
  wallLeft.position.y = wallHeight / 2
  wallLeft.material = boxMaterial
  wallLeft.receiveShadows = true
  wallLeft.setParent(diceBox)

  // top of the Box
  // const ceiling = BoxBuilder.CreateBox("ceiling",{
  //   width: size, 
  //   height: 1,
  //   depth: size
  // })
  // ceiling.position.y = wallHeight
  // ceiling.scaling = new Vector3(aspect, 1, 1)
  // ceiling.material = boxMaterial
  // ceiling.isVisible = false
  // ceiling.receiveShadows = true
  // ceiling.setParent(diceBox)
    
  // Watch for browser/canvas resize events
  // TODO: Debounce resize event
  // TODO: Animate changes so objects inside the diceBox are not lost
  // if(!enableDebugging && !enableShadows) {
  //   ground.isVisible = false
  //   wallTop.isVisible = false
  //   wallRight.isVisible = false
  //   wallBottom.isVisible = false
  //   wallLeft.isVisible = false
  //   // ceiling.isVisible = false
  // }

  return diceBox
} 

function destroyDiceBox() {
	diceBox.dispose()
}

export { createDiceBox, destroyDiceBox }