'use strict';

export{
	SmithWaterman
};

import {psGpu} from '../../lib/psGpu.js';
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


const MAX_CHAINS = 1000;
const modDir = [
		[0,0], // don't move
		[0,1],
		[1,0],
		[1,1]
	];

class SmithWaterman{

	/**
	 * Maximum area is 1 GB
	 *
	 * Basically an arbitrary size, but we have to draw the line somewhere
	 *
	 */
	static get MAXAREA(){
		// 1GB
		let maxarea = (1024**3);
		// but each pixel takes 4 elements
		maxarea /= 4;
		// and each element is a Float32 (so 4 bytes each)
		maxarea /= 4;

		SmithWaterman.MAXAREA = maxarea;
		return maxarea;
	}

	static get OptimalDimension(){
		let optimal = SmithWaterman.MAXAREA ** 0.5;
		SmithWaterman.OptimalDimension = optimal;
		return optimal;
	}

	constructor(name, a, b, opts){

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

		this.cycles = a.length + b.length - 1;
		this.remaining = a.length * b.length;
		this.totalSize = this.remaining;
		this.tokenMatch = 0;
		this.resetShareMarkers();

		this.handlers = {
			progress:[],
			complete:[]
		};

		this.pause();

		this.gpu = new psGpu({width:a.length,height:b.length});
		this.gpu.addProgram('smithwaterman', gpuFragSW);
		this.gpu.addProgram('initializeSpace', gpuFragInit);
		this.gpu.initMemory();

		let data = this.gpu.emptyData();
		let data16 = new Uint16Array(data.buffer);
		for(let x=0,pos=0; x < this.gpu.width; x++,pos+=2){
			data16[pos] = this.submissions[0][x];
		}
		for(let y=0,pos=1; y < this.gpu.height; y++,pos+=(this.gpu.width*2)){
			data16[pos] = this.submissions[1][y];
		}
		// Write the values to the image
		this.gpu.write(data);
		this.gpu.run('initializeSpace');


		this.start();
	}

	start(){
		if(this.isPaused){
			utils.defer(()=>{
				this.calc();
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
		this.gpu.destroy();
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
		let len = this.submissions[0].length;
		let x = i/len;
		let y = i%len;
		return [x,y];
	}

	calc(){
		let timeLimit = Date.now() + 500;
		while(timeLimit > Date.now()){
			for(let limit = 1000; limit>=0 && this.cycles >= 0; this.cycles--, limit--){
				this.gpu.run('smithwaterman');
			}
		}
		if(this.cycles > 0){
			utils.defer(()=>{
				this.calc();
			});
		}
		else{
			this.stop();
		}
	}

	ResolveCandidates(){
		if(this._chains) return this._chains;

		let values = this.gpu.read();
		let index = new Map();
		for(let i=values.length-4; i>=0; i-=4){
			let score = values[i+3];
			let dir = values[i+2];
			if(score === 0) continue;

			let d = {
				i: i,
				score: score,
				chain:[]
			};

			let md = modDir[dir%modDir.length];
			d.prev = i;
			d.prev -= md[0] * 1;
			d.prev -= md[1] * this.gpu.width;
			index.set(d.i, d);
		}
		let chains = [];
		let root = {score:Number.MAX_VALUE};
		const significantScore = scores.significant * scores.match;
		while(index.size > 0 && chains.length < MAX_CHAINS && root.score < significantScore){
			root = Array.from(index.values())
				.sort((a,b)=>{
					let ord = b.score - a.score;
					if(ord === 0){
						ord = a.i - b.i;
					}
					return ord;
				})
				.shift()
				;
			if(!root.score){
				index.delete(root.i);
				console.warn('This should never happen');
				continue;
			}

			for(let item = root; item; item = index.get(item.prev)){
				root.chain.push(item);
				index.delete(item.i);
			}
			let finItem = root.chain[root.chain.length-1];
			root.score -= Math.max(0,finItem.score-2);
			if(root && root.score >= scores.significant){
				chains.push(root);
			}
		}
		chains = chains
			.sort((a,b)=>{
				let ord = b.score - a.score;
				if(ord === 0){
					ord = a.i - b.i;
				}
				return ord;
			})
			.slice(0,Math.min(MAX_CHAINS,chains.length))
			;
		this._chains = chains;
		return chains;
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

let gpuFragInit = (`
	precision mediump float;

	// our texture
	uniform sampler2D u_image;
	// the texCoords passed in from the vertex shader.
	varying vec2 v_texCoord;

	// constants
	uniform vec2 u_resolution;
	uniform vec3 scores;

	void main() {
		vec4 w = texture2D(u_image, vec2(v_texCoord.x,0));
		vec4 n = texture2D(u_image, vec2(0,v_texCoord.y));
		float score = 0.0;
		score = (w.rg == n.ba) ? scores.x : scores.y;
		gl_FragColor = vec4(score,0,0,score);
	}
`);


let gpuFragSW = (`
	precision mediump float;

	// our texture
	uniform sampler2D u_image;
	// the texCoords passed in from the vertex shader.
	varying vec2 v_texCoord;

	// constants
	uniform vec2 u_resolution;
	uniform vec3 scores;

	void main() {

		/*******************************/
		// calculate the size of a pixel
		vec2 pixSize = vec2(1.0, 1.0) / u_resolution;
		vec4 pixNull = vec4(0.0,0.0,0.0,0.0);
		// find our four critical points
		vec4 here = texture2D(u_image, v_texCoord);
		vec4 nw   = texture2D(u_image, v_texCoord + vec2(-pixSize.x,-pixSize.y));
		vec4 w    = texture2D(u_image, v_texCoord + vec2(-pixSize.x,         0));
		vec4 n    = texture2D(u_image, v_texCoord + vec2(         0,-pixSize.y));
		// test for out of bounds values
		if(v_texCoord.y <= pixSize.y){
			nw = pixNull;
			n = pixNull;
		}
		if(v_texCoord.x <= pixSize.x){
			nw = pixNull;
			w = pixNull;
		}
		// Find the max score from the chain
		here.b = max(w.a, n.a);
		here.b = max(here.b, nw.a);
		// add up our new score
		here.a  = here.b + here.r;

		// Figure out what the directionality of the score was
		if(nw.a == here.b){
			here.b = 3.0/256.0;
		}
		else if(w.a == here.b){
			here.b = 2.0/256.0;
		}
		else{
			here.b = 1.0/256.0;
		}

		// apply the skip penalty if it was anything but NW
		here.a += scores.z * (here.b==float(3) ? float(0) : float(1));
		/*******************************/

		gl_FragColor = here;
	}
`);


/**
 * Can you distinguish between Shit and Shinola?
 *
 * https://www.neatorama.com/2014/02/11/Spectroscopic-Discrimination-of-Shit-from-Shinola/
 *
 * Apparently, it is actually very difficult to distinguish between the two
 * using only the human eye, though a spectromitor can easily distinguish
 * between the two.
 */
