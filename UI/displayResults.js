class DisplayResults {
	constructor() {
		this.elem = document.createElement('div');
		this.resultsElem = document.createElement('div')
		this.elem.className = 'displayResults'
		this.resultsElem.className = 'results'
		this.timeout = 500
		this.init()
	}

	init(){
		this.injectStyles()
		this.elem.append(this.resultsElem)
		document.body.prepend(this.elem)
	}
	injectStyles(){
		const style = document.createElement('style')
		style.innerHTML = `
		.displayResults {
			display: flex;
			align-items: center;
			justify-content: center;
			position: absolute;
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			pointer-events: none;
			z-index: 1;
			transform: translate3d(0,0,0);
		}
		.displayResults .results {
			background: #CCCCCC;
			font-size: 2rem;
			padding: 10px 20px;
			margin: 40px;
			border-radius: 10px;
			transform: scale(1.5);
			opacity: 0;
			transition: all ${this.timeout}ms;
		}
		.displayResults .showEffect {
			transform: scale(1);
			opacity: 1;
		}
		.displayResults .hideEffect {
			transform: scale(.5);
			opacity: 0;
		}
		.crit-success {
			color: green;
		}
		.crit-failure {
			color: firebrick;
		}
		.die-dropped {
			text-decoration: line-through;
			opacity: .4;
		}
		.die-rerolled {
			text-decoration: line-through;
			opacity: .4;
		}
		.die-exploded {
			color: green;
		}
		.die-exploded::after {
			content: '!';
			display: 'block';
			color: green;
		}
		`
		// Get the first script tag
		const ref = document.querySelector('script');

		// Insert our new styles before the first script tag
		ref.parentNode.insertBefore(style, ref);
	}
	showResults(data){
		let resultString = ''
		const rolls = this.recursiveSearch(data,'rolls').flat()

		rolls.forEach((roll,i) => {
			if(i !== 0) {
				resultString += ', '
			}
			let val = roll.value
			let classes = ''

			if(roll.critical === "success") {
				classes = 'crit-success'
			}
			if(roll.critical === "failure") {
				classes = 'crit-failure'
			}

			switch (roll.operation) {
				case "drop":
					classes += ' die-dropped'
					break;
				case "reroll":
					classes += ' die-rerolled'
					break;
				case "explode":
					classes += ' die-exploded'
					break;
			
				default:
					break;
			}

			if(classes !== ''){
				val = `<span class='${classes.trim()}'>${val}</span>`
			}

			resultString += val
		})
		resultString += ` = <strong>${data.value}</strong>`

		this.resultsElem.innerHTML = resultString
		this.resultsElem.classList.remove('hideEffect')
		this.resultsElem.classList.add('showEffect')
	}
	clear(){
		this.resultsElem.classList.replace('showEffect','hideEffect')
		setTimeout(()=>this.resultsElem.classList.remove('hideEffect'),this.timeout)
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
}

export default DisplayResults