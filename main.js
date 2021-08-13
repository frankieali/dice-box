import './style.css'
import DiceBox from './DiceBoxOffscreen'
import DiceParser from './DiceRollerParserItf'

// create DiceBox
const box = new DiceBox('#scene-container', { 
  enableDebugging: false,
  enableShadows: true
})

// create Notation Parser
const DRP = new DiceParser()

// intialize our scene
box.initScene()


// UI elements
const form = document.getElementById("dice-to-roll")
const notation = document.getElementById("input--notation")
const clearBtn = document.getElementById("btn--clear")

const submitForm = (e) => {
  e.preventDefault();

	// clear the box
	box.clear()

	// roll those dice
	box.roll(DRP.parseNotation(notation.value))
}

// triggers after each individual roll settles
box.onDieComplete = (result) => {
	// console.log(`result`, result)
}

// triggers after all dice have settled
box.onRollComplete = (results) => {
	// console.log("time to parse results", results)

	// check for rerolls if they were in the original notation
	const rerolls = DRP.handleRerolls(results)
	if(rerolls.length) {
		rerolls.forEach(roll => box.reroll(roll))
		return
	}

	// parse the final roll results
	const finalResults = DRP.parseFinalResults(results)

	// dispatch an event with the results object for other UI elements to listen for
	const event = new CustomEvent('resultsAvailable', {detail: finalResults})
	document.dispatchEvent(event)
}

form.addEventListener("submit", submitForm)
clearBtn.addEventListener("click", () => box.clear())

document.addEventListener("resultsAvailable", (e) => {
	console.log(`Got these results: `, e.detail)
})
