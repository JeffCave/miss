'use strict';

import "https://cdnjs.cloudflare.com/ajax/libs/pouchdb/6.4.3/pouchdb.min.js";
import "../../lib/pouchdb.upsert.min.js";

import * as utils from '../../util/misc.js';

/*
global PouchDB
global emit
*/

const scores = {
	// an exact positional match (diagonal in SmithWaterman terms). This is
	// the highest possible match.
	match:+2,
	// a exact mismatch. If the pattern continues, this character is a change.
	// An example of a mismatch would be "dune", and "dude": there is an
	// obvious match, but there is one character that has been completely
	// changed. This is the lowest possible match.
	mismatch: -2,
	// A partial mismatch. Generally, the insertion (or removal) of a
	// character. Depending on the context, this may be just as bad as a
	// "mismatch" or somewhere between "mismatch" and "match".
	skippable: -1,
	// The point to the terminator is to measure when the chain is broken.
	// A chain may grow in score, getting larger and larger, until
	// matches stop being made. At this point, the score will start dropping.
	// Once it drops by the points specified by the terminator, we can assume
	// it has dropped off.
	terminator: 5,
	// the number of lexemes that need to match for a chain to be considered
	// of significant length.
	significant: 5,
};


const swMatrixes = {};

class Matrix{

	constructor(name, a, b){
		this.db = new PouchDB('smithwaterman');
		this.matrix = {};
		this.finishedChains = [];

		this.name = name;
		this.submissions = [JSON.clone(a),JSON.clone(b)];

		this.remaining = this.submissions[0].length * this.submissions[1].length;
		this.totalSize = this.remaining;
		this.lastCompactionSeq = -1;

		// initialize the calculations. Creates the state for the first
		// cell to be calculated
		let allAdditions = [];
		this.submissions[0].forEach((t,i)=>{
			allAdditions.push(this.addToCell(i  ,0,'n' ,0,[]));
			allAdditions.push(this.addToCell(i+1,0,'nw',0,[]));
		});
		this.submissions[1].forEach((t,i)=>{
			allAdditions.push(this.addToCell(0,i  ,'w' ,0,[]));
			allAdditions.push(this.addToCell(0,i+1,'nw',0,[]));
		});
		// drop the keystone in
		allAdditions.push(this.addToCell(0,0,'nw',0,[]));
		// run 'er all
		Promise.all(allAdditions);
	}

	getCell(x,y){
		let row = this.matrix[y];
		if(row){
			let cell = row[x];
			if(cell){
				return cell;
			}
		}
		return {
			id: [x,y]
		};
	}

	setCell(x,y,value){
		let row = this.matrix[y];
		if(!(y in this.matrix)){
			row = {};
			this.matrix[y] = row;
		}
		value.id = [x,y];
		row[x] = value;
	}

	deleteCell(x,y){
		if(y in this.matrix){
			let row = this.matrix[y];
			if(x in row){
				delete row[x];
			}
			if(Object.keys(row).length === 0){
				delete this.matrix[y];
			}
		}
	}

	async addToCell(x,y,orig,score,chain,highwater){
		if(x < 0 || y < 0){
			return;
		}
		if(x >= this.submissions[0].length || y >= this.submissions[1].length){
			return;
		}
		let cell = this.getCell(x,y);

		if(orig in cell || 'score' in cell){
			return false;
		}

		//console.log("updating: " + key);
		let xLexeme = null;
		let yLexeme = null;
		switch(orig){
			case 'n':
				xLexeme = this.submissions[0][y-1] || {lexeme:null};
				yLexeme = this.submissions[1][x  ] || {lexeme:false};
				break;
			case 'w':
				xLexeme = this.submissions[0][y  ] || {lexeme:null};
				yLexeme = this.submissions[1][x-1] || {lexeme:false};
				break;
			case 'nw':
				xLexeme = this.submissions[0][y-1] || {lexeme:null};
				yLexeme = this.submissions[1][x-1] || {lexeme:false};
				break;
		}

		score += (xLexeme.lexeme === yLexeme.lexeme) ? scores.match : scores.mismatch;
		if(orig.length === 1){
			score += scores.skippable;
		}
		if(score < 0){
			score = 0;
		}

		cell[orig] = {
			score: score,
			chain: chain,
			highscore:highwater,
		};

		this.setCell(x,y,cell);
		utils.defer(()=>{this.calcChain(cell.id);});
		return cell;
	}

	async calcChain(coords){
		let chain = this.getCell(coords[0],coords[1]);
		if(!('n' in chain && 'w' in chain && 'nw' in chain)){
			return;
		}

		let x = chain.id[0];
		let y = chain.id[1];

		let score = Math.max(chain.n.score, chain.w.score, chain.nw.score);

		// create the record of the chain of matches. In general we favour
		// 'nw', so in the event of a tie it is chosen. North and West are
		// arbitrary.
		let highscore = null;
		let history = null;
		switch(score){
			case chain.nw.score:
				history = chain.nw.chain;
				history.unshift([x-1,y-1,score]);
				highscore = chain.nw.highscore;
				break;
			case chain.n.score:
				history = chain.n.chain;
				history.unshift([x,y-1,score]);
				highscore = chain.n.highscore;
				break;
			case chain.w.score:
				history = chain.w.chain;
				history.unshift([x-1,y,score]);
				highscore = chain.w.highscore;
				break;
		}
		if(history[0][2] === 0){
			history.shift();
		}
		highscore = Math.max(score, highscore || Number.MIN_SAFE_INTEGER);

		this.remaining--;

		// if we are running off the edge of the world, end the change
		if(x+1 >= this.submissions[0].length || y+1 >= this.submissions[1].length){
			score = Number.MIN_SAFE_INTEGER;
		}
		//console.debug("scoring: " + JSON.stringify(chain.id) + ' (' + score + ') ' + this.remaining + ' of '+this.totalSize+'('+(100.0*this.remaining/this.totalSize).toFixed(0)+'%) ');
		if(highscore - score >= scores.terminator){
			if(history.length > scores.significant){
				this.finishedChains.push({
					score:highscore,
					history:history
				});
				score = 0;
				history = [];
			}
		}
		this.deleteCell(x,y);

		utils.defer(()=>{this.addToCell( x+1 , y+1 , 'nw', score , history.slice(0) , highscore );});
		utils.defer(()=>{this.addToCell( x+1 , y   , 'w' , score , history.slice(0) , highscore );});
		utils.defer(()=>{this.addToCell( x   , y+1 , 'n' , score , history.slice(0) , highscore );});

	}

	ReportChains(){
		this.finishedChains
			.sort((a,b)=>{return b.score-a.score;})
			.forEach((chain)=>{
				chain.history.forEach((coords)=>{
					let x = coords[0];
					let y = coords[1];
					this.submissions[0][y].shared = true;
					this.submissions[1][x].shared = true;
				});
			})
			;
		return this.submissions;
	}

}

export async function SmithWatermanCompare(id, a, b, dbname){
	return new Promise((resolve,reject)=>{
		let matrix = swMatrixes[dbname];
		if(!matrix){
			matrix = new Matrix(id,a,b);
			swMatrixes[dbname] = matrix;
		}
		let int = setInterval(()=>{
			if(matrix.remaining <= 0){
				clearInterval(int);
				let entries = matrix.ReportChains();
				resolve(entries);
			}
		},1000);
	});
}
