import { Vector3 } from '@babylonjs/core/Maths/math.vector'

const defaultOptions = {
  debug: false
}

// this module has dynamically loaded modules so it's been made async
async function createCamera(options = defaultOptions) {
  const { debug } = options
  let camera
  const debugCameraDistance = 45
  const cameraDistance = 100
  if(debug) {
    console.log("creating debug camera")
    const cameraModule = await import('@babylonjs/core/Cameras/arcRotateCamera')
    camera = new cameraModule.ArcRotateCamera("ArcRotateCamera1",Math.PI/2,0,debugCameraDistance,new Vector3(0, 0, 0));
    camera.attachControl(debug.canvas, true);
    camera.minZ = 5
    camera.maxZ = debugCameraDistance * 2
  } else {
    const cameraModule = await import('@babylonjs/core/Cameras/targetCamera')
    camera = new cameraModule.TargetCamera("TargetCamera1", new Vector3(0, cameraDistance, 0))
    camera.fov = .25
    camera.minZ = 5
    camera.maxZ = cameraDistance + 1
  }

  camera.wheelPrecision = 50
  camera.setTarget(Vector3.Zero())
  return camera
}

export { createCamera }