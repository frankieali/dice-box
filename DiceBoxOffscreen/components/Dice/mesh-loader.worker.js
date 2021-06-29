import { Engine } from '@babylonjs/core/Engines/engine'
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader"

var Module = { TOTAL_MEMORY: 256 * 1024 * 1024 }

console.log(`loaded mesh worker`)

self.onmessage = (event) => {
  console.log(`event`, event)
  if(event.data.msg === 'load'){
    if(event.data.file.includes('.babylon')) {
      loadBabylonFile(event.data.file)
    }
  }
}

const loadBabylonFile = async (fileName) => {
  console.log(`fileName`, fileName)
  const model = SceneLoader.LoadAssetContainer("", fileName, null, (container) => {
    console.log(`container`, container)
  })
  console.log(`model`, model)
  self.postMessage("Working on it...")
  // const root = model.meshes[0]
  // // assuming
  // const die = model.meshes[1]
  // const collider = model.meshes[2]

  // root.setEnabled(false)
  // root.id = `${dieType}-original`
  // root.name = `${dieType}-original`
  
  // die.setEnabled(false)
  // die.receiveShadows = true
  // die.freezeNormals()
}