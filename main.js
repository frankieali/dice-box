import './style.css'
import DiceBox from './DiceBoxOffscreen'
// import DiceBox from './DiceBoxWorker'

const box = new DiceBox('#scene-container', { 
  enableDebugging: false,
  enableShadows: true,
  usePointLights: false
})

// console.log(`box`, box)

/**
 * TODO:
 *  1. DONE consolidate models into a single file to be loaded by webworker up front
 *  1. DONE Use shared array buffer with web worker for speed boost
 *  1. notation input for creating rolls
 *  2. roll group class that triggers individual rolls plus rerolls
 *  3. basic roll math for roll groups
 *  4. support plug-ins for additional roll notations
 *  5. support plug-ins for additional dice models and textures (perhaps switch colliders back to a glb or babylon file)
 *  6. clear and reroll methods
 * 
 * Future
 *  2. custom ammo build - custom IDL file to reduce file size -- https://github.com/kripken/ammo.js/pull/366
 *  3. convert textures to GPU performant format - https://doc.babylonjs.com/advanced_topics/mutliPlatTextures & https://www.npmjs.com/package/babylonjs-texture-generator
 *  4. try adding PBR materials
 *  5. micro optimizations, static classes, declair static variables outside functions, cleaner loops
 *  6. toaster popup with roll result  | d20(image) Roll 2: 19 |
 *  7. create input and outputs
 *  8. random toss direction?
 *  9. clear box, reroll
 * 10. results panel - lists all rolls and all results
 * 11. support for addons/plugins - toaster, results panel, static inputs - roller becomes an api
 * 12. websockets???
 * 13. roll sounds - on toss and tumbling
 * 14. fallback (random number generator) support for nonstandard dice such as d7 or d40
 */

box.initScene()
.then(()=>{
  console.log("initScene must be complete ... adding die")
  const dice = ['d100','d20','d12','d10','d8','d6','d4']
  const themes = ['galaxy','gemstone','glass','iron','nebula','sunrise','sunset','walnut']
  
  // const diceTest = setInterval(async () => {    
    // const dieType = dice[Math.floor(Math.random() * dice.length)]
    // await box.add({dieType: 'd20'})
    // await box.add({dieType: 'd6'})
    // await box.add({dieType: 'd12'})

    // document.addEventListener('click',() => box.add({dieType: 'd4'}))
    // .then(res => box.roll(res))
    const dieType = dice[Math.floor(Math.random() * dice.length)]
    const theme = themes[Math.floor(Math.random() * themes.length)]
    // box.add({dieType:dice[Math.floor(Math.random() * dice.length)], theme:themes[Math.floor(Math.random() * themes.length)]})

    //TODO: add camera controls
    //TODO: add d100 back
    //TODO: create roll method

    // box.add({dieType: 'd20'})
    // box.add({dieType: 'd12'})
    // box.add({dieType: 'd10'})
    // box.add({dieType: 'd8'})
    // box.add({dieType: 'd6'})
    // box.add({dieType: 'd4'})

    // .then(res => box.roll(res))
    // await box.add({dieType: 'd20'})
    // .then(res => box.roll(res))
    // await box.add({dieType: 'd8'})
    // .then(res => box.roll(res))
    // await box.add({dieType: 'd6'})
    // .then(res => box.roll(res))
    // await box.add({dieType: 'd4'})
    // .then(res => box.roll(res))
  // }, 300);

  // const diceTest = setInterval(() => {
  //   const dieType = dice[Math.floor(Math.random() * dice.length)]
  //   const theme = themes[Math.floor(Math.random() * themes.length)]
  //   // box.add({dieType, theme})
  //   box.add({dieType})
  //   // .then(res => box.roll(res))
  // }, 10);

  // setTimeout(()=>{
  //   clearInterval(diceTest)
  // }, 1000)
  // box.add({dieType:'d100'})
  // box.add({dieType:'d20'})

})

  // setTimeout(async ()=>{
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  // },10)

  // setTimeout(async ()=>{
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  //   await box.add({dieType: 'd20'})
  //   .then(res => box.roll(res))
  // },4000)


  // await box.add({dieType: 'd20',theme:'sunset'})
  // .then(res => box.roll(res))


  // DICE FOUNTAIN
  // const diceFountain = setInterval(async ()=>{
  //   const dieType = dice[Math.floor(Math.random() * dice.length)]
  //   const theme = themes[Math.floor(Math.random() * themes.length)]
  //   await box.add({dieType,theme}).then(die => box.roll(die))

  // },10)
  
  // setTimeout(()=>{
  //   clearInterval(diceFountain)
  // },10000)



  // poop out 200 random dice
  // for (let index = 0; index < 20; index++) {
  //   const dieType = dice[Math.floor(Math.random() * dice.length)]
  //   // const theme = themes[Math.floor(Math.random() * themes.length)]
  //   // const newDie = await box.add({dieType, theme}).then(res => box.roll(res))
  //   setTimeout(async ()=>{
  //     await box.add({dieType}).then(res => box.roll(res))
  //   },index*200)
  // }
  // await box.add({dieType: 'd20'}).then(res => {
  //   console.log(`res`, res)
  //   box.roll(res)
  // })
// })

// await box.add({dieType: 'd100'})
// await box.add({dieType: 'd20'})
// await box.add({dieType: 'd12'})
// await box.add({dieType: 'd10'})
// await box.add({dieType: 'd8'})
// await box.add({dieType: 'd6'})
// await box.add({dieType: 'd4'})
// const dice = ['d100','d20','d12','d10','d8','d6','d4']
// const themes = ['galaxy','gemstone']

// // await box.add({dieType: 'd20'}).then(()=>{
//   const diceFountain = setInterval(()=>{
//     const dieType = dice[Math.floor(Math.random() * 7)]
//     box.add({dieType: dieType})
//   },100)
  
//   setTimeout(()=>{
//     clearInterval(diceFountain)
//   },5000)

// })

const form = document.getElementById("dice-to-roll")
const notation = document.getElementById("notation")

const submitForm = (e) => {
  e.preventDefault();
  box.roll(notation.value)
}

form.addEventListener("submit", submitForm)


