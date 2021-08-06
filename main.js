import './style.css'
import DiceBox from './DiceBoxOffscreen'
import { DiceRoller } from "dice-roller-parser"
// import DiceBox from './DiceBoxWorker'
import { recursiveSearch } from './DiceBoxOffscreen/helpers'

let externalCount = 0
let rollsAsFloats = []

const rollParser = new DiceRoller((rolls = rollsAsFloats) => {
	if(rolls.length > 0) {
		return rolls[externalCount++]
	} else {
		console.warn("No results passed to the dice-roller-parser. Using fallback Math.random")
		return Math.random()
	}
})

const box = new DiceBox('#scene-container', { 
  enableDebugging: false,
  enableShadows: true
})


// const rollParser = new DiceRoller()

// console.log(`box`, box)

/**
 * TODO:
 *  1. DONE consolidate models into a single file to be loaded by webworker up front
 *  1. DONE Use shared array buffer with web worker for speed boost
 *  1. DONE (basic) notation input for creating rolls
 *  2. roll group class that triggers individual rolls plus rerolls
 *  3. basic roll math for roll groups and modifiers
 *  4. support plug-ins for additional roll notations
 *  5. support plug-ins for additional dice models and textures (perhaps switch colliders back to a glb or babylon file)
 *  6. clear and reroll methods
 *  7. make functions/methods more pure
 *  8. different lighting options is a fun idea but not necessary at this time - deprecate feature for now - future plugin?
 *  9. fix Babylon debug inspector
 * 10. loading indicator - can not roll until all assets have finished loading.
 * 11. post message on die result from offscreenWorker (die id as well)
 * 12. set max roll time option
 * 13. set gravity / force / spin options
 * 14. pull out camera to prevent distortion at edges
 * 15. Allow for mapped values, for non-numerical dice: 1 = success, 2 = failure, 3 = null - for future plugins
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
  // console.log("initScene must be complete ... adding die")
  const dice = ['d100','d20','d12','d10','d8','d6','d4']
  const themes = ['galaxy','gemstone','glass','iron','nebula','sunrise','sunset','walnut']
  
  // const diceTest = setInterval(async () => {    
    // const dieType = dice[Math.floor(Math.random() * dice.length)]
    const dieType = dice[Math.floor(Math.random() * dice.length)]
    const theme = themes[Math.floor(Math.random() * themes.length)]
    // box.add({dieType:dice[Math.floor(Math.random() * dice.length)], theme:themes[Math.floor(Math.random() * themes.length)]})

    //TODO: add camera controls
    //TODO: create roll method

    // box.add({dieType: 'd20'})
    // box.add({dieType: 'd12'})
    // box.add({dieType: 'd10'})
    // box.add({dieType: 'd8'})
    // box.add({dieType: 'd6'})
    // box.add({dieType: 'd4'})

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
})


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
// })

const form = document.getElementById("dice-to-roll")
const notation = document.getElementById("input--notation")
const formP = document.getElementById("dice-to-parse")
const notationP = document.getElementById("input--notation-parser")
const clearBtn = document.getElementById("btn--clear")
let externalIndex = 0
let parsedNotation, dieGroups = []

const findDie = (obj, searchKey = 'die', results = []) => {
	const r = results;
	Object.keys(obj).forEach((key,i) => {
		const value = obj[key];
		// if(key === searchKey && typeof value !== 'object'){
		if(key === searchKey){
			r.push({
				groupId: externalIndex++,
				number: obj.count.value,
				type: 'd' + obj.die.value,
				mods: obj.mods
			});
		} else if(value && typeof value === 'object'){
			// console.log(`value`, value)
			findDie(value, searchKey, r);
		}
	});
	return r;
};

const submitForm = (e) => {
  e.preventDefault();
	box.clear()
	externalIndex = 0
	const rollParser = new DiceRoller()

	parsedNotation = rollParser.parse(notation.value)
	console.log(`parsedNotation`, parsedNotation)
	dieGroups = findDie(parsedNotation)

	box.roll(dieGroups)
}

box.onRollComplete = (results) => {
	console.log("time to parse results", results)
	let parseFinal = true
	
	results.forEach(group => {
		// check for 'mods' - might need to reroll when encountered
		if(group.mods.length > 0){
			const successTest = (roll, mod, target) => {
				switch (mod) {
					case ">":
						return roll >= target;
					case "<":
						return roll <= target;
					case "=":
					default:
						return roll == target;
				}
			}
			group.mods.forEach(mod => {
				console.log(`modType`, mod.type)
				// TODO: handle each type of mod that would trigger a reroll
				const rollsCopy = {...group.rolls}
				switch(mod.type){
					case "explode":
					case "compound":
						console.log(`need a '${mod.type}' reroll`)
						// for compound: the additional rolls for each dice are added together as a single "roll" (calculated by the parser)
						//TODO: discovered that there's a bug in "dice-roller-parser" for compounded rolls. May have to switch to my local fork if PR is not accepted
						
						Object.entries(rollsCopy).forEach(([key, value]) => {
							const max = parseInt(value.type.replace('d',''))
							const target = mod.target?.value?.value || max
							if(successTest(value.result, ">", target) && !value[mod.type]) {
								group.rolls[key][mod.type] = true
								parseFinal = false
								box.reroll({
									groupId: group.groupId,
									rollId: key + '.1',
									type: value.type
								})
							}
						})
						break;
					case "penetrate":
						console.log("need a 'penetrate' reroll")
						// if die = max then it explodes, but -1 on explode result (calculated by the parser)
						// if die is d20 and explodes then it's followed by a d6
						// if die is d100 and explodes then it's followed by a d20
						// penetrating dice only explode once
						break;
					case "reroll":
						console.log("need a 'reroll' reroll")
						
						Object.entries(rollsCopy).forEach(([key, value]) => {
							const max = parseInt(value.type.replace('d',''))
							if(successTest(value.result, mod.target.mod, mod.target.value.value)  && !value.reroll) {
								group.rolls[key].reroll = true
								parseFinal = false
								box.reroll({
									groupId: group.groupId,
									rollId: key + '.1',
									type: value.type
								})
							}
						})
						break;
					case "rerollOnce":
						console.log("need a 'rerollOnce' reroll")
						break;
				}
			}) // end mods forEach
		}
	}) // end results forEach

	// do the final parse
	if(parseFinal) {
		const rolls = recursiveSearch(results,'rolls')
		rolls.forEach(roll => {
			return Object.entries(roll).forEach(([key, value]) => {
				const sides = parseInt(value.type.replace('d',''))
				rollsAsFloats.push((value.result - 1)/sides)
			})
		})

		const finalResults = rollParser.rollParsed(parsedNotation)
		console.log(`finalResults`, finalResults)
	
		// after parse clear out global variables
		externalCount = 0
		rollsAsFloats = []

		return finalResults
	}


}

// parser test to check the output on various rolls
const submitFormP = (e) => {
  e.preventDefault();
	const parser = new DiceRoller()
	let parsedNotation = parser.parse(notationP.value)
	let rollResult = parser.roll(notationP.value)
	console.log(`parsedNotation`, parsedNotation)
	console.log(`rollResult`, rollResult)

	rollsAsFloats = [.95, .55, .3]

	const fixedResults = rollParser.rollParsed(parsedNotation)
	// console.log(`fixedResults`, fixedResults)

	externalCount = 0
	rollsAsFloats = []

}

form.addEventListener("submit", submitForm)
formP.addEventListener("submit", submitFormP)
clearBtn.addEventListener("click", () => box.clear())
