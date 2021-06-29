// import * as Comlink from 'comlink'

importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");
importScripts('/public/ammo/ammo.wasm.js')

var Module = { TOTAL_MEMORY: 256 * 1024 * 1024 }
class Wrapper {

  async init() {
    return new Promise(resolve => {
      Ammo().then(() => {

        console.log("Let's work!")

        self.postMessage({ msg: 'ready' })

        let last = new Date().getTime()

        const loop = () => {
          let now = new Date().getTime()
          const delta = now - last
          last = now

          self.postMessage({ msg: 'preUpdate' })

          // const updates = this.physics.update(delta)

          self.postMessage({ msg: 'updates', updates })

          // const hasUpdated = this.physics.debugDrawerUpdate()
          // console.log(hasUpdated)

          self.postMessage({ msg: 'postUpdate' })

          requestAnimationFrame(loop)
        }

        loop()

        resolve()
      })
    })
  }
}

Comlink.expose(Wrapper)