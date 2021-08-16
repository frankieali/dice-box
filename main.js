import './style.css'
import DiceBox from './DiceBoxOffscreen'
import DiceParser from './DiceRollerParserItf'

// create DiceBox
const box = new DiceBox('#scene-container', { 
  enableShadows: true
})

// create Notation Parser
const DRP = new DiceParser()

// intialize our scene
box.initScene().then(()=>{
	// console.log(`rollit without the parser`)
	// roll a simple string
	// box.roll('4d6+3')
	// roll an array of strings
	// box.roll(['4d6+3','1d12'])
	// box.roll([{sides:20,qty:2}])
	// box.add('4d8')
})


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
		rerolls.forEach(roll => box.add(roll,roll.groupId))
		return
	}

	// parse the final roll results
	const finalResults = DRP.parsedNotation ? DRP.parseFinalResults(results) : results

	// dispatch an event with the results object for other UI elements to listen for
	const event = new CustomEvent('resultsAvailable', {detail: finalResults})
	document.dispatchEvent(event)
}

form.addEventListener("submit", submitForm)
clearBtn.addEventListener("click", () => box.clear())

document.addEventListener("resultsAvailable", (e) => {
	console.log(`Got these results: `, e.detail)
})
