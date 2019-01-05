'use strict';


export{
	SmithWatermanAlgorithmBaseClass
};

export default class SmithWatermanAlgorithmBaseClass{

	/**
	 * Maximum area is 1 GB
	 *
	 * Basically an arbitrary size, but we have to draw the line somewhere
	 */
	static get MAXAREA(){
		if(SmithWatermanAlgorithmBaseClass._MAXAREA){
			return SmithWatermanAlgorithmBaseClass._MAXAREA;
		}
		// 1GB
		let maxarea = (1024**3);
		// but each pixel takes 4 elements
		maxarea /= 4;
		// and each element is a Float32 (so 4 bytes each)
		maxarea /= 4;

		SmithWatermanAlgorithmBaseClass._MAXAREA = maxarea;
		return maxarea;
	}

	static get OptimalDimension(){
		if(SmithWatermanAlgorithmBaseClass._OptimalDimension){
			return SmithWatermanAlgorithmBaseClass._OptimalDimension;
		}
		let optimal = SmithWatermanAlgorithmBaseClass.MAXAREA ** 0.5;
		SmithWatermanAlgorithmBaseClass.OptimalDimension = optimal;
		return optimal;
	}

	constructor(name, a, b, opts){
		this._ = {};
		this._.scores = {
			match:+1,
			mismatch: -1,
			skippable: -1,
			terminus: 5,
			significant: 5,
		};
		this._.scores = JSON.merge(this._.scores, opts);
	}

	/**
	 * an exact positional match (diagonal in SmithWaterman terms). This is
	 * the highest possible match.
	 */
	get ScoreMatch(){
		return this._.scores.match;
	}

	// a exact mismatch. If the pattern continues, this character is a change.
	// An example of a mismatch would be "dune", and "dude": there is an
	// obvious match, but there is one character that has been completely
	// changed. This is the lowest possible match.
	get ScoreMismatch(){
		return this._.scores.mismatch;
	}

	/**
	 * A partial mismatch. Generally, the insertion (or removal) of a
	 * character. Depending on the context, this may be just as bad as a
	 * "mismatch" or somewhere between "mismatch" and "match".
	 */
	get ScoreSkippable(){
		return this._.scores.skippable;
	}

	/**
	 * The point to the terminus is to measure when the chain is broken.
	 * A chain may grow in score, getting larger and larger, until
	 * matches stop being made. At this point, the score will start dropping.
	 * Once it drops by the points specified by the terminator, we can assume
	 * it has dropped off.
	 */
	get ScoreTerminus(){
		return this._.terminus;
	}

	/**
	 * the number of lexemes that need to match for a chain to be considered
	 * of significant length.
	 */
	get ScoreSignificant(){
		return this._.significant;
	}

	start(){
		this.postMessage({type:'start'});
	}

	pause(){
		this.isPaused;
		this.postMessage({type:'pause'});
	}

	terminate(){
		this.stop();
	}

	stop(){
		this.postMessage({type:'stop'});
	}

	postMessage(msg){
		if(this.isPosting){
			return;
		}
		this.isPosting = true;
		if(!msg.data && typeof msg.type !== 'undefined'){
			// simulating a worker thread message?
			msg = {
				data:msg
			};
		}
		if(!msg.data.type){
			throw new Error("Invalid message type: " + msg.data.type);
		}
		if(this.onmessage){
			this.onmessage(msg);
		}
		this.isPosting = false;
	}

	CoordToIndex(x,y){
		return y * this.submissions[0].length + x;
	}

	IndexToCoord(i){
		let len = this.submissions[0].length;
		let x = i/len;
		let y = i%len;
		return [x,y];
	}


}

