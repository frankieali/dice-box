class DisplayResults {
	constructor() {
		this.elem = document.createElement('div');
		this.resultsElem = document.createElement('div')
		this.elem.className = 'displayResults'
		this.resultsElem.className = 'results'
		this.timeout = 500
		this.injectStyles()
		this.init()
	}

	init(){
		// add html for results
		// add listener for event
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
		`
		// Get the first script tag
		const ref = document.querySelector('script');

		// Insert our new styles before the first script tag
		ref.parentNode.insertBefore(style, ref);
	}
	showResults(data){
		let resultString = ''
		data.rolls.forEach((roll,i) => {
			if(i !== 0) {
				resultString += ', '
			}
			resultString += `${roll.value}`
		})
		resultString += ` = <strong>${data.value}</strong>`

		this.resultsElem.innerHTML = resultString
		this.resultsElem.classList.remove('hideEffect')
		// this.elem.style.display='none';
		// this.elem.offsetHeight; // no need to store this anywhere, the reference is enough
		// this.elem.style.display='flex';
		this.resultsElem.classList.add('showEffect')
	}
	clear(){
		this.resultsElem.classList.replace('showEffect','hideEffect')
		setTimeout(()=>this.resultsElem.classList.remove('hideEffect'),this.timeout)
		
	}
}

export default DisplayResults