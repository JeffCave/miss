'use strict';

export{
	swAlgoGpu
};

import * as utils from '../../util/misc.js';
import {psGpu} from '../../lib/psGpu.js';
import {SmithWatermanBase} from './swAlgoBase.js';


const MAX_CHAINS = 1000;
const modDir = [
		[0,0], // don't move
		[0,1],
		[1,0],
		[1,1]
	];

class swAlgoGpu extends SmithWatermanBase{
	constructor(name, a, b, opts){
		super(name, a, b, opts);

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

		this.remaining = a.length + b.length - 1;
		this.totalSize = this.remaining;
		this.tokenMatch = 0;

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
			data16[pos] = this.submissions[0][x].lexeme;
		}
		for(let y=0,pos=1; y < this.gpu.height; y++,pos+=(this.gpu.width*2)){
			data16[pos] = this.submissions[1][y].lexeme;
		}
		// Write the values to the image
		this.gpu.write(data);
		//this.debugDraw();
		this.gpu.run('initializeSpace');
		//this.debugDraw();


		this.start();
	}

	destroy(){
		if(this.gpu){
			this.gpu.destroy();
			this.gpu = null;
			delete this.gpu;
		}
	}

	get remaining(){
		if(this._.remaining < 0){
			this._.remaining = 0;
		}
		return this._.remaining;
	}
	set remaining(value){
		this._.remaining = value;
	}

	start(){
		if(this.isPaused === true){
			utils.defer(()=>{
				this.calc();
			});
		}
		this.isPaused = false;
	}

	stop(){
		if(!this.gpu) return;

		this.pause();
		let chains = this.ResolveCandidates();

		let msg = {type:'stopped',data:this.status};
		msg.data.chains = chains;
		msg.data.submissions = this.submissions;

		if(this.remaining === 0){
			msg.type = 'complete';
		}

		this.destroy();
		this.postMessage(msg);
	}

	calc(){
		let timeLimit = Date.now() + 100;
		while(timeLimit > Date.now()){
			for(let limit = 100; limit>=0 && this.remaining > 0; this.remaining--, limit--){
				//this.debugDraw();
				this.gpu.run('smithwaterman');
				//this.debugDraw();
			}
		}

		// Periodically report it up
		let msg = {type:'progress', data:this.toJSON()};
		this.postMessage(msg);

		if(this.remaining > 0){
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

		// Copy values out of the GPU data into a JS array, but skip anything
		// that did not get a score at all.
		let values = this.gpu.read();
		let index = new Map();
		for(let i=values.length-4; i>=0; i-=4){
			let d = {
				i:i,
				score:values[i+3],
				dir: values[i+2]
			};

			if(d.score > 0){
				index.set(d.i, d);
			}
		}
		values = null;


		/*
		* Now for the fun part
		*/
		let chains = [];
		let root = {score:Number.MAX_VALUE};
		this.resetShareMarkers(Number.MAX_VALUE);
		while(index.size > 0 && chains.length < MAX_CHAINS && root.score >= this.ScoreSignificant){
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

			root.history = [];
			for(let item = root; item; item = index.get(item.prev)){
				root.history.push(item);
				index.delete(item.i);

				item.x = Math.floor(item.i/4)%this.gpu.width;
				item.y = Math.floor(Math.floor(item.i/4)/this.gpu.width);

				/*
				 * If the character was already used by a previous chain, it
				 * means this chain can't have it, and we have broken our chain
				 */
				let a = this.submissions[0][item.x];
				let b = this.submissions[1][item.y];
				if(a.shared < chains.length || b.shared < chains.length){
					item.prev = -1;
					continue;
				}
				a.shared = chains.length;
				b.shared = chains.length;

				let md = modDir[item.dir%modDir.length];
				item.prev = item.i;
				item.prev -= md[0] * 1 * 4;
				item.prev -= md[1] * this.gpu.width * 4;
			}
			let finItem = root.history[root.history.length-1];
			root.score -= Math.max(0,finItem.score-2);
			if(root.score >= this.ScoreSignificant){
				chains.push(root);
			}
		}
		index.clear();
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
		this.submissions.forEach((sub)=>{
			sub.forEach((lex)=>{
				if(lex.shared > chains.length){
					lex.shared = null;
				}
			});
		});

		this._chains = chains;
		return chains;
	}

	debugDraw(){
		let body = document.body;
		let table = this.gpu.HtmlElement;
		if(table !== body.firstChild){
			body.insertBefore(table,body.firstChild);
		}
	}


}

const gpuFragInit = (`
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


const gpuFragSW = (`
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
