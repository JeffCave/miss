'use strict';


export{
	SmithWaterman
};

import * as utils from '../../util/misc.js';


const scores = {
	// an exact positional match (diagonal in SmithWaterman terms). This is
	// the highest possible match.
	match:+1,
	// a exact mismatch. If the pattern continues, this character is a change.
	// An example of a mismatch would be "dune", and "dude": there is an
	// obvious match, but there is one character that has been completely
	// changed. This is the lowest possible match.
	mismatch: -1,
	// A partial mismatch. Generally, the insertion (or removal) of a
	// character. Depending on the context, this may be just as bad as a
	// "mismatch" or somewhere between "mismatch" and "match".
	skippable: -1,
	// The point to the terminus is to measure when the chain is broken.
	// A chain may grow in score, getting larger and larger, until
	// matches stop being made. At this point, the score will start dropping.
	// Once it drops by the points specified by the terminator, we can assume
	// it has dropped off.
	terminus: 5,
	// the number of lexemes that need to match for a chain to be considered
	// of significant length.
	significant: 5,
};


class SmithWaterman{

	constructor(name, a, b){

		if(!a && !b && name.name){
			a = name.submissions[0];
			b = name.submissions[1];
			name = name.name;
		}
		this.matrix = [];
		this.partial = new Map();
		this.finishedChains = [];

		this.name = name;
		this.submissions = [a,b];

		this.remaining = this.submissions[0].length * this.submissions[1].length;
		this.totalSize = this.remaining;
		this.tokenMatch = 0;
		this.resetShareMarkers();

		this.handlers = {
			progress:[],
			complete:[]
		};

		this.pause();

		// initialize the calculations. Creates the state for the first
		// cell to be calculated
		this.addToCell(0,0,'nw',0,[],Number.MIN_SAFE_INTEGER);
	}

	start(){
		if(this.isPaused){
			utils.defer(()=>{
				this.calcBuffer();
			});
		}
		this.isPaused = false;
	}

	pause(){
		this.isPaused = true;
	}

	terminate(){
		this.stop();
	}

	stop(){
		this.pause();
		this.ResolveCandidates();
		let entries = this.submissions;
		let msg = {type:'stopped',data:entries};
		if(this.remaining === 0){
			msg.type = 'complete';
		}
		this.postMessage(msg);
	}

	postMessage(msg){
		if(this.isPosting){
			return;
		}
		this.isPosting = true;
		if(this.onmessage){
			this.onmessage(msg);
		}
		this.isPosting = false;
	}



	CoordToIndex(x,y){
		return y * this.submissions[0].length + x;
	}

	IndexToCoord(i){
		let len =this.submissions[0].length;
		let x = i/len;
		let y = i%len;
		return [x,y];
	}

	async addToCell(x,y,orig,score,chain,highwater){
		// bounds checking
		if(x < 0 || y < 0){
			return false;
		}
		if(x >= this.submissions[0].length || y >= this.submissions[1].length){
			return false;
		}
		// lookup the data at that location
		let index = this.CoordToIndex(x,y);
		let cell = this.partial.get(index);
		if(!cell){
			// create it if necessary
			cell = {id:[x,y]};
			this.partial.set(index,cell);
		}

		// have we already processed this value?
		if(orig in cell){
			return false;
		}

		// initialize values that exist at the begining of the world
		if(x === 0){
			cell.w = {score:0,chain:[],highscore:Number.MIN_SAFE_INTEGER};
			cell.nw = {score:0,chain:[],highscore:Number.MIN_SAFE_INTEGER};
		}
		if(y === 0){
			cell.n = {score:0,chain:[],highscore:Number.MIN_SAFE_INTEGER};
			cell.nw = {score:0,chain:[],highscore:Number.MIN_SAFE_INTEGER};
		}

		// set the values
		cell[orig] = {
			score: score,
			chain: chain,
			highscore:highwater,
		};

		// have we calcuated up the three pre-requisites sufficiently to
		// solve the problem?
		if('n' in cell && 'w' in cell && 'nw' in cell){
			// take it out of the pre-processing queue, and add it to the
			// processing queue
			this.partial.delete(index);
			this.matrix.push(cell);
		}

		// if the pre-processing queue is empty, do the actual calcuations
		if(this.partial.size === 0){
			this.calcBuffer();
		}
		return cell;
	}

	calcBuffer(){
		if(this.calcBufferInstance){
			return;
		}

		this.calcBufferInstance = utils.defer(()=>{
			this.calcBufferInstance = null;

			// this thing is supposed to be a multi-threaded thing. We may need
			// a way to stop it
			if(this.isPaused){
				return;
			}

			// Process as many as we can for 100 milliseconds. Then stop and let
			// other things get some processing in
			let cutOff = Date.now()+500;
			let bufferConsumed = 0;
			while(bufferConsumed < this.matrix.length && Date.now() < cutOff){
				// Just process 100 items... no matter what
				for(let i=0; i<100 && bufferConsumed < this.matrix.length > 0; i++){
					//console.log(this.matrix[bufferConsumed].id[0]+this.matrix[bufferConsumed].id[1] +':'+this.matrix[bufferConsumed].id+'('+this.matrix.length+')');
					this.calcChain(this.matrix[bufferConsumed]);
					bufferConsumed++;
				}
			}
			this.matrix = this.matrix.slice(bufferConsumed);
			//console.log('=====');

			// Periodically report it up
			let msg = {type:'progress', data:this.toJSON()};
			this.postMessage(msg);

			// schedule the next processing cycle
			if(this.matrix.length > 0){
				this.calcBuffer();
			}
			else{
				// we are finished processing, but may not quite be finished
				// all the clean up. To be honest, I think I'm implementing
				// this due to a memory of and bug that has since been fixed.
				//
				// Since I'm implementing it:
				//
				// Create a function that watches for the current cycle to be
				// finished. Once the cycle is finished, then do a full stop.
				const stopper = ()=>{
					if(this.calcBufferInstance){
						utils.defer(stopper);
					}
					else{
						this.stop();
					}
				};
				stopper();
			}

		});
	}

	calcChain(chain){
		let x = chain.id[0];
		let y = chain.id[1];


		/****** LOOKUP SCORE FOR CURRENT PATH ******/
		let score = Math.max(chain.n.score, chain.w.score, chain.nw.score);

		// create the record of the chain of matches. In general we favour
		// 'nw', so in the event of a tie it is chosen. North and West are
		// arbitrary.
		let highscore = null;
		let history = null;
		let path = null;
		switch(score){
			case chain.nw.score:
				history = chain.nw.chain;
				history.unshift([x-1,y-1,score]);
				highscore = chain.nw.highscore;
				path = 'nw';
				break;
			case chain.n.score:
				history = chain.n.chain;
				history.unshift([x,y-1,score]);
				highscore = chain.n.highscore;
				path = 'n';
				break;
			case chain.w.score:
				history = chain.w.chain;
				history.unshift([x-1,y,score]);
				highscore = chain.w.highscore;
				path = 'w';
				break;
		}
		if(history[0][2] === 0){
			history = [];
			highscore = 0;
		}



		/***** CALCULATE CURRENT SCORE ******/
		//console.log("updating: " + key);
		let axis1 = this.submissions[1][y];
		let axis0 = this.submissions[0][x];
		// add the match or mismatch score
		let localScore = 0;
		if(axis0.lexeme === axis1.lexeme){
			localScore = scores.match;
			// if it is not "NW" match, it is a skipped character
			if(path.length === 1){
				localScore += scores.skippable;
			}
		}
		else{
			localScore = scores.mismatch;
		}
		score += localScore;
		if(score < 0){
			score = 0;
		}
		highscore = Math.max(score, highscore || 0);



		/****** PUSH SCORE FORWARD ********/
		// if we are running off the edge of the world, end the chain
		if(x+1 >= this.submissions[0].length || y+1 >= this.submissions[1].length){
			history.unshift([x,y,score]);
			score = Number.MIN_SAFE_INTEGER;
		}
		//console.debug("scoring: " + JSON.stringify(chain.id) + ' (' + score + ') ' + this.remaining + ' of '+this.totalSize+'('+(100.0*this.remaining/this.totalSize).toFixed(0)+'%) ');
		if(highscore - score >= scores.terminus){
			// rewind our chain to the highwater mark
			while(history.length > 0 && highscore > history[0][2]){
				history.shift();
			}
			// check to ensure that the chain is of significant length to be kept
			if(history.length >= scores.significant){
				this.finishedChains.push({
					score:highscore,
					history:history
				});
				score = 0;
				history = [];
			}
		}

		this.addToCell( x+1 , y+1 , 'nw', score , history.slice(0) , highscore );
		this.addToCell( x+1 , y   , 'w' , score , history.slice(0) , highscore );
		this.addToCell( x   , y+1 , 'n' , score , history.slice(0) , highscore );

		// the "remaining" value is a sentinal, so make sure you do it very
		// last (ensuring the work is actually complete)
		this.remaining--;
		if(score > 0){
			this.tokenMatch++;
			this.submissions[0][x].shared = true;
			this.submissions[1][y].shared = true;
		}
	}

	ResolveCandidates(){
		let resolved = [];
		this.tokenMatch = 0;
		this.resetShareMarkers();

		// sort the chains to get the best scoring ones first
		this.finishedChains.sort((a,b)=>{return b.score-a.score;});
		while(this.finishedChains.length > 0){
			let chain = this.finishedChains.shift();

			// walk the chain checking for coordinates we have already assigned
			// to a previous chain
			let i = 0;
			let truncated = false;
			for(i = 0; i< chain.history.length; i++){
				let coords = chain.history[i];
				let x = coords[0];
				let y = coords[1];
				// if we have already followed a chain, stop processing
				if(this.submissions[0][x].shared && this.submissions[1][y].shared){
					truncated = true;
					break;
				}
				// this element belongs to this chain, indicate that future
				// chains should not use it
				this.submissions[0][x].shared = true;
				this.submissions[1][y].shared = true;
			}

			if(!truncated){
				// add it to the finished list
				resolved.push(chain);
				this.tokenMatch += chain.history.length;
			}
			else{
				let truncatedScore = chain.history[i][2];
				// we made changes to the list, so we will need to reconsider
				// what we are going to do with it. Start by actually
				// truncating the chain
				chain.history = chain.history.slice(0,i);
				// the chain's values have possibly changed, so it will need
				// to be recalcualted
				for(i = chain.history.length-1; i>=0; i--){
					if(chain.history[i][2] < truncatedScore){
						truncatedScore = chain.history[i][2];
					}
					chain.history[i][2] -= truncatedScore;
				}
				// having subtracted a value from the historical chain score,
				// there is a reasonable chance we have changed the length of
				// the chain.
				// TODO: This actually seems a faulty assumption to me.
				// That that chain is invalid is true, but that means another
				// chain may have been valid instead. Do we need to go back and
				// re-evaluate the entire grid? Disallowing previous matches?
				//
				// Hmm.. advantage having the whole thing calculated: all you
				// need to do is calculate each chain in order, and having all
				// the matrix values allows you to calculate the chain based
				// on ignoring results you have already handled. In the works
				// of Michael Caines: "Programming is hard.~"
				//
				// That's annoying... proceeding with faulty assumption
				truncated = false;
				chain.score = 0;
				for(i = 0; i < chain.history.length; i++){
					if(chain.history[i][2] === 0){
						truncated = true;
						break;
					}
					chain.score = Math.max(chain.score, chain.history[i][2]);
				}
				if(truncated){
					chain.history = chain.history.slice(0,i);
				}

				// put it back in processing queue (at the end because it is
				// now going to be almost worthless?)
				if(chain.history.length >= scores.significant){
					this.finishedChains.push(chain);
				}

				// we may have changed the scoring due to this
				this.finishedChains.sort((a,b)=>{
					let score = b.score-a.score;
					if(score === 0){
						score = b.history.length-a.history.length;
					}
					return score;
				});
			}
		}


		// we removed a bunch of chains, but may have marked lexemes as shared.
		// they aren't anymore, so re-run the entire "shared" markers
		this.resetShareMarkers();
		resolved.forEach((chain)=>{
			chain.history.forEach((coord)=>{
				let x = coord[0];
				let y = coord[1];
				this.submissions[0][x].shared = true;
				this.submissions[1][y].shared = true;
			});
		});

		return resolved;
	}

	resetShareMarkers(){
		this.submissions.forEach((sequence)=>{
			sequence.forEach((lexeme)=>{
				delete lexeme.shared;
			});
		});
	}

	toJSON(){
		let json = {
			name: this.name,
			totalSize: this.totalSize,
			remaining: this.remaining,
			tokenMatch: this.tokenMatch,
			submissions: [
					{
						totalTokens:this.submissions[0].length
					},
					{
						totalTokens:this.submissions[1].length
					}
				]
		};
		return json;
	}

}

/**
 * Can you distinguish between Shit and Shinola?
 *
 * https://www.neatorama.com/2014/02/11/Spectroscopic-Discrimination-of-Shit-from-Shinola/
 *
 * Apparently, it is actually very difficult to distinguish between the two
 * using only the human eye, though a spectromitor can easily distinguish
 * between the two.
 */
