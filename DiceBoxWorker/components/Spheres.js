import { Color3, Mesh, PhysicsImpostor, StandardMaterial, TransformNode, Vector3, VertexBuffer } from '@babylonjs/core'

class Spheres {
  constructor(engine, scene, light, count){
    this.engine = engine
    this.scene = scene
    this.count = count
    this.instances = new TransformNode("spheres")
    this.light = light
    this.createSphere(count)
    this.createSpheres(count)
  }

  createSphere(count) {
    this.sphere = Mesh.CreateSphere("sphere-original", 16, 2);
    this.sphere.material = new StandardMaterial("sphere_material")
    this.sphere.material.emissiveColor = Color3.White();
    this.sphere.position.y = 8
    this.sphere.isVisible = false
    this.sphere.scaling = new Vector3(.5, .5, .5)
    this.sphere.alwaysSelectAsActiveMesh = true;

    let colorData = new Float32Array(4 * count);

    for (var index = 0; index < count; index++) {
        colorData[index * 4] = Math.random();
        colorData[index * 4 + 1] = Math.random();
        colorData[index * 4 + 2] = Math.random();
        colorData[index * 4 + 3] = 1.0;
    }

    var buffer = new VertexBuffer(this.engine, colorData, VertexBuffer.ColorKind, false, false, 4, true);
    this.sphere.setVerticesBuffer(buffer);
  }

  createSpheres(count) {
    // Function to generate random number 
    const randomNumber = (min, max) => { 
      return Math.floor(Math.random() * (max - min) + min)
    }
    
    for (let index = 0; index < count; index++) {
      setTimeout(()=>{
        const sphere = this.sphere.createInstance(`sphere-${index}`)
        sphere.alwaysSelectAsActiveMesh = true;
        sphere.position.y = 12
        sphere.position.x = Math.random()
        sphere.position.z = Math.random()
        sphere.isVisible = true
        this.light.shadowGenerator.addShadowCaster(sphere)
        sphere.physicsImpostor = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, { mass: 1, restitution: 0.8 });
        sphere.parent = this.instances
      },100 * index)
    }

    setTimeout(()=>{
      setInterval(()=>{
        const num = randomNumber(0,count)
        const sphere = this.scene.getMeshByName(`sphere-${num}`)
        sphere.position = new Vector3(0,12,0)
      }, 50)

    },count*100)
  }
}

export default Spheres