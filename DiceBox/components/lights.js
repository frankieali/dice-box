// import { DirectionalLight, HemisphericLight, ShadowGenerator, Vector3 } from '@babylonjs/core'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'

function createLights(enableShadows) {
  const d_light = new DirectionalLight("DirectionalLight", new Vector3(-0.5, -1, -0.5))
  d_light.position = new Vector3(5, 10, 5)
  d_light.intensity = .7
  
  const h_light = new HemisphericLight("HemisphericLight", new Vector3(1, 1, 0))
  h_light.intensity = .4
  
  if(enableShadows){
    d_light.shadowMinZ = 1
    d_light.shadowMaxZ = 50
    d_light.shadowGenerator = new ShadowGenerator(1024, d_light);
    // d_light.shadowGenerator.usePoissonSampling = true;
    // d_light.shadowGenerator.bias = 0
    d_light.shadowGenerator.useCloseExponentialShadowMap = true;
    d_light.shadowGenerator.darkness = .6;
  }

  return {directional: d_light, hemispheric: h_light}
}

export { createLights }