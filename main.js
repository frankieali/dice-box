import './style.css'
import DiceBox from './DiceBoxOffscreen'
import DiceParser from './DiceRollerParserItf'
import DisplayResults from './UI/displayResults'

// create DiceBox
const box = new DiceBox('#scene-container', { 
  enableShadows: true,
	theme: 'sunrise'
})

// create Notation Parser
const DRP = new DiceParser()

// intialize our scene
box.initScene().then(()=>{
	// console.log(`rollit without the parser`)
	// roll a simple string
	// box.roll('4d6+3','sunset')
	// roll an array of strings
	// box.roll(['4d6+3','1d12'])
	// box.roll([{sides:20,qty:2}])
	// box.add('4d8').add('4d6')
})


// UI elements
const form = document.getElementById("dice-to-roll")
const notation = document.getElementById("input--notation")
const clearBtn = document.getElementById("btn--clear")
const results = new DisplayResults()

const submitForm = (e) => {
  e.preventDefault();

	// clear the box
	box.clear()
	results.clear()

	// roll those dice
	box.roll(DRP.parseNotation(notation.value))
}

// triggers after each individual roll settles
box.onDieComplete = (result) => {
	// console.log(`result`, result)
}

// triggers after all dice have settled
let flag = true
box.onRollComplete = (results) => {
	// console.log("time to parse results", results)

	// check for rerolls if they were in the original notation
	const rerolls = DRP.handleRerolls(results)
	if(rerolls.length) {
		// console.log(`rerolls`, rerolls)
		rerolls.forEach(roll => box.add(roll,roll.groupId))
		return
	}

	// if(flag){
	// 	box.remove(results[1].rolls['4'])
	// 	box.add('4d6')
	// 	box.reroll(results[0].rolls['3']).add('1d20')
	// 	flag = false
	// 	return
	// }

	// parse the final roll results
	const finalResults = DRP.parsedNotation ? DRP.parseFinalResults(results) : results

	// dispatch an event with the results object for other UI elements to listen for
	const event = new CustomEvent('resultsAvailable', {detail: finalResults})
	document.dispatchEvent(event)
}

form.addEventListener("submit", submitForm)
clearBtn.addEventListener("click", () => {
	box.clear()
	results.clear()
})

document.addEventListener("resultsAvailable", (e) => {
	console.log(`Got these results: `, e.detail)
	results.showResults(e.detail)
})
