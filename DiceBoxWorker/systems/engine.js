import { Engine } from '@babylonjs/core/Engines/engine'
import "@babylonjs/core/Engines/Extensions/engine.debugging"

function createEngine(canvas) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  })

  window.addEventListener("resize", () => {
    engine.resize()
  })

  return engine
}

export { createEngine }