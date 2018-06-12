'use strict';

import "https://cdnjs.cloudflare.com/ajax/libs/pouchdb/6.4.3/pouchdb.min.js";
import "../../lib/pouchdb.upsert.min.js";

import * as utils from '../../util/misc.js';

/*
global PouchDB
global emit
*/

const scores = {
	match:10,
	mismatch: -11,
	skippable: -1,
};


class Matrix{

	constructor(name, a, b, dbname = 'smithwaterman'){
		this.db = new PouchDB(dbname);
		this.name = name;
		this.submissions = [a,b];

		this.remaining = this.submissions[0].length * this.submissions[1].length;
		this.totalSize = this.remaining;
		this.lastCompactionSeq = -1;

		// initialize the calculations. Creates the state for the first
		// cell to be calculated
		this.submissions[0].forEach((t,i)=>{
			this.addToCell(i ,0,'n',0);
			this.addToCell(i+1,0,'nw',0);
		});
		this.submissions[1].forEach((t,i)=>{
			this.addToCell(0,i,'w',0);
			this.addToCell(0,i+1,'nw',0);
		});
		// drop the keystone in
		this.addToCell(0,0,'nw',0);
	}

	async destroy(){
		let results = await this.db.allDocs({
			startkey: [this.name,'.'].join(''),
			endkey: [this.name,'.\ufff0'].join('')
		});
		let deleted = results.rows.map(r=>{
			let val = {
				_id: r.id,
				_rev: r.value.rev,
				_deleted: true
			};
			return val;
		});
		await this.db.bulkDocs(deleted);
		await this.db.compact();
		return deleted;
	}

	async fill(){
		let designDoc = {
			constants:{
				id:this.name
			},
			views:{
				columns:{
					map: function(doc){
						let key = doc._id.split('.');
						let y = key.pop();
						let x = key.pop();
						x = parseInt(x,10);
						key = [key.join('.'),y];
						emit(key,x);
					}.toString(),
					reduce: '_stats'
				},
				complete:{
					map: function(doc){
						if(!('score' in doc)){
							return;
						}
						let key = doc._id.split('.');
						let y = key.pop();
						let x = key.pop();
						x = parseInt(x,10);

						key = [key.join('.'),y];
						emit(key,x);
					}.toString(),
					reduce: '_stats'
				},
			},
			filters: {
				cells: function (doc,req) {
					//console.log("BBBB"+'{{name}}');
					//let isvalid = true;
					//if(req.query.name){
					//	isvalid = doc._id.startsWith(req.query.name);
					//}
					//return isvalid;
					return true;
				}.toString(),
			}
		};
		designDoc = JSON.stringify(designDoc)
			.replace(/{{name}}/g,this.name)
			;
		designDoc = JSON.parse(designDoc);
		await this.db.upsert('_design/smithwaterman',function(doc){
			if(utils.docsEqual(doc,designDoc)){
				return false;
			}
			return designDoc;
		});

		this.db.changes({
				//filter:'smithwaterman/cells',
				since:'now',
				live:true,
				include_docs:true
			})
			.on('change', (e)=>{
				if(e.seq - this.lastCompactionSeq > 10000){
					this.db.compact();
					this.lastCompactionSeq = e.seq;
				}
				if(e.deleted){
					return;
				}
				this.calcCell(e.doc);
			});

		let edges = await this.db.query('smithwaterman/complete',{
			reduce:true,
			group:true,
			group_level:2
		});
		edges = edges.rows.map(r=>{
			let y = r.key[1];
			let x = r.value.max;
			return [this.name,x,y].join('.');
		});
		edges = await this.db.allDocs({
			include_docs: true,
			keys: edges
		});
		edges.rows.forEach((d)=>{
			this.calcCell(d.doc);
		});

		return edges;
	}

	addToCell(x,y,orig,score,chain=[]){
		if(x < 0 || y < 0){
			return;
		}
		if(x >= this.submissions[0].length || y >= this.submissions[1].length){
			return;
		}
		let key = [this.name,x,y].join('.');
		this.db.upsert(key,(doc)=>{
			if(orig in doc || 'score' in doc){
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

			doc[orig] = {
				score: score,
				chain: chain,
			};
			return doc;
		});
	}

	calcCell(doc){
		if(!('n' in doc && 'w' in doc && 'nw' in doc)){
			return;
		}
		if(doc._deleted === true){
			return;
		}

		let orig = JSON.clone(doc);

		let name = doc._id.split('.');
		let y = parseInt(name.pop(),10);
		let x = parseInt(name.pop(),10);
		name = name.join('.');

		let score = doc.score;
		if(typeof score === 'undefined'){
			score = Math.max(doc.n, doc.w, doc.nw);
		}

		// create the record of the chain of matches. In general we favour
		// 'nw', so in the event of a tie it is chosen. North and West are
		// arbitrary.
		switch(doc.score){
			case doc.nw:
				doc.chain = doc.nw.chain;
				doc.chain.push([x-1,y-1,doc.score]);
				break;
			case doc.n:
				doc.chain = doc.n.chain;
				doc.chain.push([x,y-1,doc.score]);
				break;
			case doc.w:
				doc.chain = doc.w.chain;
				doc.chain.push([x-1,y,doc.score]);
				break;
		}

		this.addToCell( x   , y+1 , 'n' , score , doc.chain );
		this.addToCell( x+1 , y+1 , 'nw', score , doc.chain );
		this.addToCell( x+1 , y   , 'w' , score , doc.chain );

		if('score' in doc){
			return;
		}

		this.remaining--;
		doc.score = score;

		//delete doc.n;
		//delete doc.nw;
		//delete doc.w;

		if(score === 0){
			doc = {
				_deleted : true,
				_id : doc._id,
				_rev : doc._rev
			};
		}
		else{
			console.debug("scoring: " + doc._id + ' (' + score + ') ' + this.remaining + ' of '+this.totalSize+'('+(100.0*this.remaining/this.totalSize).toFixed(0)+') ');
		}
		if(utils.docsEqual(doc,orig)){
			return false;
		}
		this.db.put(doc);
	}

}

export async function SmithWatermanCompare(id, a, b, dbname){
	return new Promise((resolve,reject)=>{
		let matrix = new Matrix(id,a,b,dbname);
		matrix.fill();
		//await matrix.destroy();
		let int = setInterval(()=>{
			if(matrix.filled){
				clearInterval(int);
				resolve(matrix.filled);
			}
		},1000);
	});
}
