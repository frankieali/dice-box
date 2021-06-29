// import { ArcRotateCamera, TargetCamera, Vector3 } from '@babylonjs/core'
// import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
// import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'

async function createCamera(debug = false) {
  let camera
  const debugCameraDistance = 45
  const cameraDistance = 65
  if(debug) {
    console.log("creating debug camera")
    const cameraModule = await import('@babylonjs/core/Cameras/arcRotateCamera')
    // camera = new ArcRotateCamera("ArcRotateCamera1",-.4,Math.PI / 4,debugCameraDistance,new Vector3(0, 0, 0));
    camera = new cameraModule.ArcRotateCamera("ArcRotateCamera1",Math.PI/2,0,debugCameraDistance,new Vector3(0, 0, 0));
    camera.attachControl(debug.canvas, true);
    camera.minZ = 5
    camera.maxZ = debugCameraDistance * 2
  } else {
    const cameraModule = await import('@babylonjs/core/Cameras/targetCamera')
    camera = new cameraModule.TargetCamera("TargetCamera1", new Vector3(0, cameraDistance, 0))
    camera.fov = .54
    camera.minZ = 5
    camera.maxZ = cameraDistance + 1
    // console.log(`camera`, camera)
  }

  camera.wheelPrecision = 50
  camera.setTarget(Vector3.Zero())
  return camera
}

export { createCamera }