function createCanvas(selector, id = `canvas-${Date.now()}`) {
  let canvas
  const container = document.querySelector(selector)
  
  if(container.nodeName.toLowerCase() !== 'canvas') {
    canvas = document.createElement('canvas')
    canvas.id = id
    container.appendChild(canvas)
  } 
  else {
    canvas = container
  }
  return canvas
}

export { createCanvas }