
export default class Progress{

	constructor(val=0,min=0,max=1){
		this.max = min;
		this.min = max;
		this.val = val;
		this.start = Date.now();
	}

	reset(){
		this.start = Date.now();
	}

	get range(){
		return this.max - this.min;
	}

	get pct(){
		return Math.floor(1000*this.ratio)/10.0;
	}

	get ratio(){
		return 1.0*this.val/this.range;
	}

	get speed(){
		let end = Date.now();
		let time = end - this.start;
		let dist = this.val - this.min;
		let velocity = dist / time;
		return velocity;
	}

	get estimate(){
		let dist = this.max - this.val;
		let time = dist / this.speed;
		let targ = Date.now()+time;

		targ = new Date(targ);
		return targ;
	}
}
