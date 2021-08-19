import { DiceRoller } from "dice-roller-parser"

let externalCount = 0

class ParserInterface {
	constructor(options = {}){
		this.rollsAsFloats = []
		this.dieGroups = []
		this.parsedNotation = null
		this.finalResults = null

		this.initParser()
	}

	// Set up the parser with our custom random function
	initParser(){
		this.rollParser = new DiceRoller((rolls = this.rollsAsFloats) => {
			if(rolls.length > 0) {
				return rolls[externalCount++]
			} else {
				console.warn("No result was passed to the dice-roller-parser. Using fallback Math.random")
				return Math.random()
			}
		})
	}

	parseNotation(notation) {
		// clean out the gunk
		this.clear()
		// parse the raw string notation
		this.parsedNotation = this.rollParser.parse(notation)

		// create a new object of just dice needed for rolling
		const findDie = (obj) => {
			this.dieGroups.push({
				qty: obj.count.value,
				sides: obj.die.value,
				mods: obj.mods
			})
		}

		this.recursiveSearch(this.parsedNotation, 'die', [], findDie)

		return this.dieGroups
	}

	rollNotation(notationObject) {
		this.finalResults = this.rollParser.rollParsed(notationObject)
		return this.finalResults
	}

	clear(){
		externalCount = 0
		this.rollsAsFloats = []
		this.dieGroups = []
		this.parsedNotation = null
		this.finalResults = null
	}

	// make this static for use by other systems?
	recursiveSearch(obj, searchKey, results = [], callback) {
		const r = results;
		Object.keys(obj).forEach(key => {
			const value = obj[key];
			// if(key === searchKey && typeof value !== 'object'){
			if(key === searchKey){
				r.push(value);
				if(callback && typeof callback === 'function') {
					callback(obj)
				}
			} else if(value && typeof value === 'object'){
				this.recursiveSearch(value, searchKey, r, callback);
			}
		});
		return r;
	}
	incrementId(key) {
		key = key.toString()
		let splitKey = key.split(".")
		if(splitKey[1]){
			splitKey[1] = parseInt(splitKey[1]) + 1
		} else {
			splitKey[1] = 1
		}
		return splitKey[0] + "." + splitKey[1]
	}

	// TODO: this needs to return a object of rolls that need to be rolled again, 
	handleRerolls(rollResults = []) {
		const rerolls = []
		rollResults.forEach((group, groupId) => {
			// check for 'mods' - might need to reroll when encountered
			if(group.mods?.length > 0){
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
					// console.log(`modType`, mod.type)
					// console.log(`mod`, mod)
					// TODO: handle each type of mod that would trigger a reroll
					const rollsCopy = {...group.rolls}
					switch(mod.type){
						case "explode":
						case "compound":
							console.log(`adding '${mod.type}' reroll`)
							// for compound: the additional rolls for each dice are added together as a single "roll" (calculated by the parser)
							//TODO: discovered that there's a bug in "dice-roller-parser" for compounded rolls. May have to switch to my local fork if PR is not accepted
							
							Object.entries(rollsCopy).forEach(([key, value]) => {
								const max = value.sides
								const target = mod.target?.value?.value || max
								const op = mod.target?.mod || '>'
								if(successTest(value.result, op, target) && !value.modifier) {
									group.rolls[key].modifier = mod.type
									rerolls.push({
										groupId,
										rollId: this.incrementId(key),
										sides: value.sides,
										qty: 1
									})
								}
							})
							break;
						case "penetrate":
							console.log("adding 'penetrate' reroll")
							// if die = max then it explodes, but -1 on explode result (calculated by the parser)
							// ! Turning this into a future feature or option "HackMaster: true" - option for plugin or override
							// if die is d20 and explodes then it's followed by a d6
							// if die is d100 and explodes then it's followed by a d20
							// this gets complicated for d100 and d20 rerolls
							// d20 explode triggers a d6. The parser will parse extra die value as a d20 and not a d6. So the value as float is incorrect. Same for d100. Need to do some extra math. Would want to convert the value here, perhaps with a flag on the reroll
							Object.entries(rollsCopy).forEach(([key, value]) => {
								// console.log(`mod`, mod)
								// console.log(`mod.target`, mod.target)
								const max = value.sides
								const target = mod.target?.value?.value || max
								const op = mod.target?.mod || '='
								if(successTest(value.result, op, target) && !value.modifier) {
									group.rolls[key].modifier = mod.type
									rerolls.push({
										groupId,
										rollId: this.incrementId(key),
										// sides: value.sides === 100 ? 20 : value.sides === 20 ? 6 : value.sides,
										sides: value.sides,
										qty: 1
									})
								}
							})
							break;
						case "reroll":
							console.log("adding 'reroll' reroll")
							Object.entries(rollsCopy).forEach(([key, value]) => {
								const max = value.sides
								if(successTest(value.result, mod.target.mod, mod.target.value.value)  && !value.modifier) {
									group.rolls[key].modifier = mod.type
									rerolls.push({
										groupId,
										rollId: this.incrementId(key),
										sides: value.sides,
										qty: 1
									})
								}
							})
							break;
						case "rerollOnce":
							console.log("adding 'rerollOnce' reroll")
							Object.entries(rollsCopy).forEach(([key, value]) => {
								const target = mod.target?.value?.value
								const op = mod.target.mod
								if(successTest(value.result, op, target)  && !value.modifier && !key.includes(".")) {
									group.rolls[key].modifier = mod.type
									rerolls.push({
										groupId,
										rollId: this.incrementId(key),
										sides: value.sides,
										qty: 1
									})
								}
							})
							break;
					}
				}) // end mods forEach
			}
		}) // end results forEach

		return rerolls
	}

	parseFinalResults(rollResults = []) {
		// do the final parse
		const rolls = this.recursiveSearch(rollResults,'rolls')
		rolls.forEach(roll => {
			return Object.entries(roll).forEach(([key, value]) => {
				const sides = value.sides
				this.rollsAsFloats.push((value.result - 1)/sides)
			})
		})

		const finalResults = this.rollParser.rollParsed(this.parsedNotation)

		// save a reference to the final results
		this.finalResults = finalResults
	
		// after parse clear out global variables
		externalCount = 0
		this.rollsAsFloats = []

		return finalResults
	}
}

export default ParserInterface