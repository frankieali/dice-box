import { ArcRotateCamera, AmmoJSPlugin, Color3, DirectionalLight, Engine, FreeCamera, HemisphericLight, MeshBuilder, PhysicsImpostor, Scene, StandardMaterial, TargetCamera, Vector3 } from '@babylonjs/core'
import "@babylonjs/inspector"
import * as Ammo from "ammo.js";

let ammoModule
const ammoReadyPromise = new Promise((resolve) => {
  new Ammo().then((res) => {
    ammoModule = res
    resolve(res)
  });
});

class DiceBox {

  // Future - set dimensions as an option - not currently implemented
  constructor(container,dimensions) {
    this.container = document.querySelector(container)
    this.w = dimensions ? dimensions.w : this.container.clientWidth
    this.h = dimensions ? dimensions.h: this.container.clientHeight
    this.cameraDistance = 35
    this.aspect = this.w / this.h
    this.init()
  }

  async init() {
    console.log(this.container)
    if(this.container.nodeName.toLowerCase() !== 'canvas') {
      this.canvas = document.createElement('canvas')
      this.canvas.id = 'dice-canvas'
      this.canvas.width = this.w
      this.canvas.height = this.h
      this.container.appendChild(this.canvas)
      console.log(`this.canvas`, this.canvas)
    } else {
      this.canvas = this.container
    }

    // Engine
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    })

    // Scene
    this.scene = new Scene(this.engine)
    this.scene.useRightHandedSystem = true;
    this.scene.debugLayer.show({
      embedMode: true,
    });

    // Lights
    let light = new DirectionalLight(
      "DirectionalLight",
      new Vector3(-0.5, -1, -0.5),
      this.scene
    );
    light.position = new Vector3(5, 10, 5)
    light.shadowMinZ = 1
    light.shadowMaxZ = 50
    const h_light = new HemisphericLight("light", new Vector3(1, 1, 0))

    // Camera
    // this.aspect = Math.min(this.w, this.h) //return which is larger
    // _that.scale = Math.sqrt(this.w * this.w + this.h * this.h) / 13;
    // this.renderer.setSize(this.w, this.h)
    // this.wh = this.h / this.aspect / Math.tan(10 * Math.PI / 180)

    // this.camera = new TargetCamera("camera", new Vector3(0, this.scale, 0), this.scene)
    // this.camera = new FreeCamera("camera", new Vector3(0, this.cameraDistance, 0), this.scene)
    this.camera = new ArcRotateCamera("camera1",-.4,Math.PI / 3,30,new Vector3(0, this.cameraDistance, 0),this.scene);
    this.camera.wheelPrecision = 50
    // this.camera.fov = 0.94
    // this.camera.fov = 1
    this.camera.setTarget(Vector3.Zero())
    this.camera.attachControl(this.canvas, true);

    // Action
    await ammoReadyPromise
    this.scene.enablePhysics(new Vector3(0, -10, 0), new AmmoJSPlugin(true, ammoModule))
    this.scene.getPhysicsEngine().setSubTimeStep(60);

    // Register a render loop to repeatedly render the scene
    this.engine.runRenderLoop(function () {
      _that.scene.render();
    });
    
    // Watch for browser/canvas resize events
    const _that = this
    window.addEventListener("resize", function () {
      _that.engine.resize();
      let tAspect = _that.engine.getAspectRatio(_that.camera)
      _that.ground.scaling.x = tAspect
      _that.ground.physicsImpostor.forceUpdate()
      _that.wallTop.scaling.x = tAspect
      _that.wallTop.physicsImpostor.forceUpdate()
      _that.wallBottom.scaling.x = tAspect
      _that.wallBottom.physicsImpostor.forceUpdate()
      _that.wallRight.position.x = _that.cameraDistance * _that.canvas.clientWidth / _that.canvas.clientHeight / 2
      _that.wallRight.physicsImpostor.forceUpdate()
      _that.wallLeft.position.x = _that.cameraDistance * _that.canvas.clientWidth / _that.canvas.clientHeight / -2
      _that.wallLeft.physicsImpostor.forceUpdate()
    });
    this.load()
  }

  async load() {
    console.log("loading DiceBox component!")
    this.createBox()
  }

  createBox() {
    console.log("let's create some walls")
    const wallHeight = 5
    const boxMaterial = new StandardMaterial("diceBox_material", this.scene)
    boxMaterial.diffuseColor = new Color3(1, 0, 0);
    // this.ground = MeshBuilder.CreatePlane("ground",{
    //   width: this.cameraDistance*this.w/this.h, 
    //   height: this.cameraDistance
    // })
    this.ground = MeshBuilder.CreatePlane("ground",{
      width: this.cameraDistance, 
      height: this.cameraDistance
    })
    this.ground.rotation.x = Math.PI / 2
    this.ground.rotation.y = Math.PI
    this.ground.scaling = new Vector3(this.aspect, 1, 1)
    this.ground.material = boxMaterial
    this.ground.physicsImpostor = new PhysicsImpostor(this.ground, PhysicsImpostor.PlaneImpostor,{ mass: 0, friction: 10, restitution: 0.6 }, this.scene)

    this.wallTop = MeshBuilder.CreatePlane("wallTop",{
      width: this.cameraDistance,
      height: wallHeight
    })
    this.wallTop.position.y = wallHeight / 2
    this.wallTop.position.z = this.cameraDistance / -2
    this.wallTop.rotation.y = Math.PI
    this.wallTop.scaling = new Vector3(this.aspect, 1, 1)
    this.wallTop.material = boxMaterial
    this.wallTop.physicsImpostor = new PhysicsImpostor(this.wallTop, PhysicsImpostor.PlaneImpostor,{ mass: 0, friction: 4, restitution: 0.6 }, this.scene)

    this.wallRight = MeshBuilder.CreatePlane("wallRight",{
      width: this.cameraDistance, 
      height: wallHeight
    })
    this.wallRight.position.x = this.cameraDistance*this.w/this.h / 2
    this.wallRight.position.y = wallHeight / 2
    this.wallRight.rotation.y = Math.PI / 2
    this.wallRight.material = boxMaterial
    this.wallRight.physicsImpostor = new PhysicsImpostor(this.wallRight, PhysicsImpostor.PlaneImpostor,{ mass: 0, friction: 4, restitution: 0.6 }, this.scene)

    this.wallBottom = MeshBuilder.CreatePlane("wallBottom",{
      width: this.cameraDistance, 
      height: wallHeight
    })
    this.wallBottom.position.y = wallHeight / 2
    this.wallBottom.position.z = this.cameraDistance / 2
    this.wallBottom.scaling = new Vector3(this.aspect, 1, 1)
    this.wallBottom.material = boxMaterial
    this.wallBottom.physicsImpostor = new PhysicsImpostor(this.wallBottom, PhysicsImpostor.PlaneImpostor,{ mass: 0, friction: 4, restitution: 0.6 }, this.scene)

    this.wallLeft = MeshBuilder.CreatePlane("wallLeft",{
      width: this.cameraDistance, 
      height: wallHeight
    })
    this.wallLeft.position.x = this.cameraDistance*this.w/this.h / -2
    this.wallLeft.position.y = wallHeight / 2
    this.wallLeft.rotation.y = Math.PI * 1.5
    this.wallLeft.material = boxMaterial
    this.wallLeft.physicsImpostor = new PhysicsImpostor(this.wallLeft, PhysicsImpostor.PlaneImpostor,{ mass: 0, friction: 4, restitution: 0.6 }, this.scene)
  }
} 

export default DiceBox