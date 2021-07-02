# dice-box
High performance 3D dice roller made with BabylonJS and AmmoJS

Performance has been micro-optimized for Chrome browsers. Implemented with web workers, ammojs wasm, and offscreen canvas rendering. Can we do [Typed Arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays) or [Atomics](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics)?
Fallback support for other browsers coming soon. (Come on Firefox, where's your offscreenCanvas support? I expected more from you)

## Demo
I actually got it working. This is just an early prototype.

http://dice-box.s3-website.us-east-2.amazonaws.com/

Go ahead, roll 1000d6. Individual die roll results only appear in the developer's console for now.

## Goals
I'm hoping to turn this package into an npm module with plug-in capabilities. I'm currently in the early phases of working out the plug-in architecture. Plans are to keep the UI and the dice rolling mechanics seperate, allow for texture and 3d model packs, and extensible dice notation (such as exploding dice).

## Inspiration
This project was inspired by:

 - [Owl Bear Rodeo](https://www.owlbear.rodeo/) - They have a great dice box implemented with React. I'm still using their dice textures while in dev

 - [Teal Dice](http://a.teall.info/dice/) - Wonderful dice roller that should be updated and modularized. Check out [Major Victory's version](http://dnd.majorsplace.com/dice)

 - [yandeu/ammo-worker-test](https://github.com/yandeu/ammo-worker-test) - Great example of how to get a web worker running with a 3D engine

 - [AmmoJS Demo](https://rawcdn.githack.com/kripken/ammo.js/99d0ec0b1e26d7ccc13e013caba8e8a5c98d953b/examples/webgl_demo/ammo.wasm.html) for Web Assembly support
