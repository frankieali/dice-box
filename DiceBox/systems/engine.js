import { Engine } from '@babylonjs/core/Engines/engine'

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