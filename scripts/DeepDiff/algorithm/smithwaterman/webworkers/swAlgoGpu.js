'use strict';

import {psGpu} from '../../../lib/psGpu.js';
import {SmithWatermanBase} from '../swAlgoBase.js';

const utils = {
	defer: function(func){
		return setTimeout(func,0);
	}
};

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

		this.submissions.forEach((sub,s)=>{
			sub.forEach((lex,i)=>{
				if(lex.lexeme > 65535){
					throw new Error('Token '+name+'['+s+']['+i+'] is greater than 65535 ('+lex.lexeme+')');
				}
			});
		});

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
		//this.postMessage({type:'progress', data:this.toJSON()});
		this.gpu.run('initializeSpace');
		//this.postMessage({type:'progress', data:this.toJSON()});

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

		this.postMessage(msg);
		this.destroy();
	}

	calc(){
		let timeLimit = Date.now() + 100;
		while(timeLimit > Date.now()){
			for(let limit = 100; limit>=0 && this.remaining > 0; this.remaining--, limit--){
				//this.postMessage({type:'progress', data:this.toJSON()});
				this.gpu.run('smithwaterman');
				//this.postMessage({type:'progress', data:this.toJSON()});
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
				dir: values[i+1]
			};

			d.score = new Uint16Array(values.buffer,i,2);
			d.score = d.score[1];

			if(d.score > 0){
				index.set(d.i, d);
			}
		}
		values = null;


		/*
		* Now for the fun part
		*/
		let resolved = [];
		let chain = {score:Number.MAX_VALUE};
		this.resetShareMarkers(Number.MAX_VALUE);

		while(index.size > 0 && resolved.length < this.MaxChains && chain.score >= this.ScoreSignificant){
			chain = Array.from(index.values())
				.sort((a,b)=>{
					let ord = b.score - a.score;
					if(ord === 0){
						ord = a.i - b.i;
					}
					return ord;
				})
				.shift()
				;
			if(!chain.score){
				index.delete(chain.i);
				console.warn('This should never happen');
				continue;
			}

			// walk the chain checking for coordinates we have already assigned
			// to a previous chain
			chain.history = [];
			for(let item = chain; item; item = index.get(item.prev)){
				chain.history.push(item);
				index.delete(item.i);

				item.x = Math.floor(item.i/4)%this.gpu.width;
				item.y = Math.floor(Math.floor(item.i/4)/this.gpu.width);

				/*
				 * If the character was already used by a previous chain, it
				 * means this chain can't have it, and we have broken our chain
				 */
				let a = this.submissions[0][item.x];
				let b = this.submissions[1][item.y];
				if(a.shared < resolved.length || b.shared < resolved.length){
					item.prev = -1;
					continue;
				}
				// this element belongs to this chain, indicate that future
				// chains should not use it
				a.shared = resolved.length;
				b.shared = resolved.length;


				// map the next node in the chain
				let md = modDir[item.dir%modDir.length];
				item.prev = item.i;
				item.prev -= md[0] * 1 * 4;
				item.prev -= md[1] * this.gpu.width * 4;
			}

			let finItem = chain.history[chain.history.length-1];
			chain.score -= Math.max(0,finItem.score-this.ScoreMatch);
			if(chain.score >= this.ScoreSignificant){
				resolved.push(chain);
			}
		}
		index.clear();
		resolved = resolved
			.sort((a,b)=>{
				let ord = b.score - a.score;
				if(ord === 0){
					ord = a.i - b.i;
				}
				return ord;
			})
			.slice(0,Math.min(this.MaxChains,resolved.length))
			;
		// we removed a bunch of chains, but may have marked lexemes as shared.
		// they aren't anymore, so re-run the entire "shared" markers
		this.submissions.forEach((sub)=>{
			sub.forEach((lex)=>{
				if(lex.shared > resolved.length){
					lex.shared = null;
				}
			});
		});

		this._chains = resolved;
		return resolved;
	}

	postMessage(msg){
		//msg.html = this.html;
		postMessage(msg);
	}

	get html(){
		//if(this._html && this._htmlN >= 2){
		//	return this._html;
		//}
		if(!this.gpu){
			return this._html || '';
		}

		function format(val){
			val = "\u00a0\u00a0\u00a0" + val;
			val = val.split('').reverse().slice(0,3).reverse().join('');
			return val;
		}

		let val = this.gpu.read();
		let values = Array.from(val).map(d=>{
			return format(d);
		});
		let v = 0;

		let table = [];
		let row = ['&nbsp;'];
		for(let c=0; c<this.gpu.width; c++){
			row.push(c);
		}
		table.push(row.map((d)=>{return '<td>'+d+'</td>';}).join(''));

		for(let r=0; r<this.gpu.height && v<values.length; r++){
			let row = [r];
			for(let c=0; c<this.gpu.width && v<values.length; c++){
				let cell = [
					[values[v+0],values[v+1]].join('&nbsp;'),
					[values[v+2],values[v+3]].join('&nbsp;'),
				].join('\n');
				v += 4;
				row.push(cell);
			}
			table.push(row.map((d)=>{return '<td style="border:1px solid black;">'+d+'</td>';}).join(''));
		}
		table = table.join('</tr><tr>');

		this._html = "<table style='border:1px solid black;'><tr>"+table+"</tr></table>";
		this._htmlN = (this._htmlN || 0) +1;

		return this._html;
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
		w *= 255.0;
		n *= 255.0;
		// exact match
		if(int(w.r) == int(n.b) && int(w.g) == int(n.a)){
			score = scores.x;
		}
		// a mis-match
		else{
			score = scores.y;
		}
		gl_FragColor = vec4(score,0,score,0);
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

	/*******************************************************
	 * Encode values across vector positions
	 *
	 * https://stackoverflow.com/a/18454838/1961413
	 */
	const vec4 bitEnc = vec4(255.0, 65535.0, 16777215.0, 4294967295.0);
	const vec4 bitDec = 1.0/bitEnc;
	vec4 EncodeFloatRGBA (float v) {
		vec4 enc = bitEnc * v;
		enc = fract(enc);
		enc -= enc.yzww * vec2(1.0/255.0, 0.0).xxxy;
		return enc;
	}
	float DecodeFloatRGBA (vec4 v) {
		return dot(v, bitDec);
	}
	/* https://stackoverflow.com/a/18454838/1961413
	 *
	 *******************************************************/


	void main() {

		vec3 scoresExpanded = (scores*bitEnc.x)-127.0;
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

		/*******************************/
		// Find the max score from the chain
		float nwScore = (nw.b*bitEnc.x) + (nw.a*bitEnc.y);
		float wScore  = ( w.b*bitEnc.x) + ( w.a*bitEnc.y);
		float nScore  = ( n.b*bitEnc.x) + ( n.a*bitEnc.y);

		// pick the biggest of the highest score
		float score = 0.0;
		score = max(score, nwScore);
		score = max(score,  wScore);
		score = max(score,  nScore);

		// Figure out what the directionality of the score was
		if(int(score) == int(nwScore)){
			here.g = 3.0/bitEnc.x;
			// remove the skip penalty for the diagonal case (we add it later)
			score -= scoresExpanded.z;
		}
		else if(int(score) == int(wScore)){
			here.g = 2.0/bitEnc.x;
		}
		else{
			here.g = 1.0/bitEnc.x;
		}

		// apply the skip penalty (we already removed it if it was NW)
		score += scoresExpanded.z;

		// add up our new score
		score += (here.r*bitEnc.x)-127.0;

		// clamp it to Zero
		score = max(score , 0.0);
		score = min(score , bitEnc.y);

		// place the result in the last two registers
		here.a = floor(score / 256.0);
		here.b = score - (here.a*256.0);
		/*******************************/

		here.ba = here.ba / bitEnc.x;
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


let matrix = null;


onmessage = function(params){
	if(matrix === null && params.data.action === 'start') {
		console.log("Initializing web worker");

		let id = params.data.name;
		let a = params.data.submissions[0];
		let b = params.data.submissions[1];
		let opts = params.data.options;

		matrix = new swAlgoGpu(id,a,b,opts);
	}
	if(matrix !== null){
		if(params.data.action === 'start'){
			console.log("Starting web worker");
			matrix.start();
		}
		else if(params.data.action === 'pause'){
			matrix.pause();
		}
		else if(params.data.action === 'stop'){
			matrix.stop();
		}
	}
};
