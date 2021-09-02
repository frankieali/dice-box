# dice-box
High performance 3D dice roller made with BabylonJS and AmmoJS

Performance has been micro-optimized for Chrome browsers. Implemented with web workers, ammojs wasm, and offscreen canvas rendering. Can we do [Typed Arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays) or [Atomics](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics)? *Update* - I tried Typed Arrays. They were not any faster unfortunatly.
Fallback support for other browsers coming soon. (Come on Firefox, where's your offscreenCanvas support? I expected more from you)

## Demo
I actually got it working. ~~This is just an early prototype.~~ 
I've updated the demo to show basically the early alpha release.

https://d3rivgcgaqw1jo.cloudfront.net/index.html

Go ahead, roll 500d6. ~~Individual die roll results only appear in the developer's console for now.~~

### Update: 8/16/2021
I've made many updates and enhancement in the past couple of months. Options are now being passed through to the worker threads to give more control over the physics and other dice themes. I've cleaned up a lot of the code and added inline comments. I was able to hook up an external dice parser from [BTMorton](https://github.com/BTMorton/dice_roller) to handle complex rolls such as `roll 4 six-sided dice and drop the lowest` '4d6dl1' and critical rolls '5d10!'. The dice parser can handle any standard rolls from the [Roll20 Specification](https://help.roll20.net/hc/en-us/articles/360037773133-Dice-Reference#DiceReference-RollTemplates).

### Update 8/24/2021
I now have the roller demo working in Firefox and Safari. I have not tested on mobile devices yet. I've modified the code to conditionally support `offscreenCanvas`.

A working NPM module should be ready soon.

### Update 9/2/2021
I've done a lot of work to shrink the library file sizes of BabylonJS and AmmoJS. I saved a lot of bytes by chopping down the `babylonFileLoader.js` and doing a custom AmmoJS build. I've also compressed the textures to what I feel is reasonable. The total deliverable is now 2MB and using brotli compression it brings it down to 800kB. That's down from a 5MB package. Not bad for a full 3D environment with a physics engine.

I have a new demo up, now hosted by Amazon CloudFront so you can see the brotli compression in action. Sometimes the dice are very blurry for me on first load. Giving the page a refresh cleared this up.

## Goals
I'm hoping to turn this package into an npm module with plug-in capabilities. I'm currently in the early phases of working out the plug-in architecture. Plans are to keep the UI and the dice rolling mechanics seperate, allow for texture and 3d model packs, and extensible dice notation (such as exploding dice).

### Alpha Release
I've released the initial 3D dice project at https://github.com/3d-dice/dice-box. It can be installed from npm using `npm install @3d-dice/dice-box`. Documentation is a work in progress.

## Inspiration
This project was inspired by:

 - [Owl Bear Rodeo](https://www.owlbear.rodeo/) - They have a great dice box implemented with React. I'm still using their dice textures while in dev

 - [Teal Dice](http://a.teall.info/dice/) - Wonderful dice roller that should be updated and modularized. Check out [Major Victory's version](http://dnd.majorsplace.com/dice)

 - [yandeu/ammo-worker-test](https://github.com/yandeu/ammo-worker-test) - Great example of how to get a web worker running with a 3D engine

 - [AmmoJS Demo](https://rawcdn.githack.com/kripken/ammo.js/99d0ec0b1e26d7ccc13e013caba8e8a5c98d953b/examples/webgl_demo/ammo.wasm.html) for Web Assembly support
