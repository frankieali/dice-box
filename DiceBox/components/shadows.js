
function createShadows(object,light) {
  console.log(object)
  console.log(object.getChildren())
  object.getChildren().forEach(mesh => {
    light.shadowGenerator.addShadowCaster(mesh)
  })
}

export { createShadows }