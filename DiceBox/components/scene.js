import { AmmoJSPlugin, Color3, Scene, Vector3, SceneOptimizer, SceneOptimizerOptions } from '@babylonjs/core'
import "@babylonjs/inspector"
import * as Ammo from "ammo.js";

let ammoModule
const ammoReadyPromise = new Promise((resolve) => {
  new Ammo().then((res) => {
    ammoModule = res
    resolve(res)
  })
})

async function createScene(engine, debug = false) {
  const scene = new Scene(engine)
  const gravity = -30
  scene.useRightHandedSystem = true
  scene.clearColor = new Color3(1, 1, 1);
  if(debug) {
    console.log("initializing scene inspector")
    scene.debugLayer.show({
      embedMode: true,
    })
  }

  await ammoReadyPromise
  scene.enablePhysics(new Vector3(0, gravity, 0), new AmmoJSPlugin(true, ammoModule))
  scene.getPhysicsEngine().setSubTimeStep(25)

  const optimizationSettings = SceneOptimizerOptions.LowDegradationAllowed()
  optimizationSettings.optimizations = optimizationSettings.optimizations.splice(1)
  optimizationSettings.targetFrameRate = 60
  // console.log(`optimizationSettings`, optimizationSettings)

  SceneOptimizer.OptimizeAsync(scene,optimizationSettings)

  return scene
}

export { createScene }