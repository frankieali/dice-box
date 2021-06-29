import { Mesh, PhysicsImpostor, SceneLoader, TransformNode, Vector3 } from '@babylonjs/core'
import { loadTheme } from './themes'

let meshes = {}, themes = {}, diceCombos = {}, count = 1

class Dice {

  constructor({die, theme, method}, light) {
    this.die = die
    this.theme = theme
    this.light = light
    method === 'instance' ? this.createInstance() : this.createClone()
  }

  createInstance() {

    const original = diceCombos[`${this.die}_${this.theme}`]
    const parent = new TransformNode(`${this.die}-${count}`)
    // const parent = meshes[this.die].meshes[0].createInstance(`${this.die}-${count}`)
    original.getChildren().forEach(mesh => {
      if(mesh.name.includes('die')) {
        // console.log(`mesh.getChildren()`, mesh.getChildren())
        // const locators = mesh.getChildren()


        const dieInstance = mesh.createInstance(`die-${count}`)
        // const dieInstance = mesh.clone(`die-${count}`)
        dieInstance.alwaysSelectAsActiveMesh = true;
        // console.log(`dieInstance`, dieInstance)
        // for (let child of mesh.getChildTransformNodes()) {
        //   const locator = child.clone();
        //   locator.setAbsolutePosition(child.getAbsolutePosition());
        //   locator.name = child.name;
        //   dieInstance.addChild(locator);
        // }
        const locators = mesh.getChildTransformNodes()
        dieInstance._children = [...locators]
        // this.light.shadowGenerator.addShadowCaster(dieInstance)
        dieInstance.setParent(parent)
      }
      if(mesh.name.includes('collider')) {
        const colliderInstance = mesh.createInstance(`collider-${count}`)
        colliderInstance.isVisible = false
        colliderInstance.physicsImpostor = new PhysicsImpostor(colliderInstance, PhysicsImpostor.ConvexHullImpostor, { mass: 0 });
        colliderInstance.setParent(parent)
      }
      
    })
    count++
    console.log(`count`, count)
    parent.position = new Vector3(Math.random(), 16 + count , Math.random())
    parent.physicsImpostor = new PhysicsImpostor(parent, PhysicsImpostor.NoImpostor, { damping: 1, mass: 200, friction: 10, restitution: .4 });
  }

  createClone() {
    // console.log(`create clone`)
    const parent = meshes[this.die].meshes[0].clone(`${this.die}-${count}`)
    parent.id = `${this.die}-${count}`
    parent.getChildren().forEach(mesh => {
      if(mesh.name.includes('die')) {
        mesh.id = `die-${count}`
        mesh.name = `die-${count}`
        // const materialClone = diceMaterial.clone()
        // materialClone.diffuseColor = random_rgb()
        // mesh.material = materialClone
        mesh.material = themes[this.theme]
        mesh.receiveShadows = true
        mesh.isVisible = true
        this.light.shadowGenerator.addShadowCaster(mesh)
        // shadowGenerator2.addShadowCaster(mesh);
        // shadowGenerator3.addShadowCaster(mesh);
        mesh.setParent(parent)
      }
      if(mesh.name.includes('collider')) {
        mesh.id = `collider-${count}`
        mesh.name = `collider-${count}`
        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.ConvexHullImpostor, { mass: 0 });
        mesh.setParent(parent)
      }
    });
    count++
    parent.position = new Vector3(Math.random(), 16, Math.random())
    parent.physicsImpostor = new PhysicsImpostor(parent, PhysicsImpostor.NoImpostor, { damping: 1, mass: 200, friction: 10, restitution: .4 });
    // save combo
    diceCombos[`${this.die}_${this.theme}`] = parent
    
    // return parent

    // add it to diceCombos for future instances

  }

  // TODO: add themeOptions for colored materials, must ensure theme and themeOptions are unique somehow
  static async loadModel({die, theme = 'gemstone', themeOptions = {}}) {
    let method = 'instance'
    if (!Object.keys(meshes).includes(die)) {
      const root = await SceneLoader.ImportMeshAsync(["die","collider"], "./DiceBox/assets/models/", `${die}.glb`)
      root.meshes[0].id = `${die}-original`
      root.meshes[0].name = `${die}-original`
      // hide the original meshes
      root.meshes[1].isVisible = false
      root.meshes[2].isVisible = false

      meshes[die] = root
      method = 'clone'
    }
    if (!Object.keys(themes).includes(theme)) {
      themes[theme] = await loadTheme(theme);
      method = 'clone'
    }
    if(!Object.keys(diceCombos).includes(`${die}_${theme}`)) {
      method = 'clone'
    }
    return {
      die,
      theme,
      method
    }
  }

  static roll() {

  }

}

export default Dice