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

		this.remaining = 0;

		// initialize the calculations. Creates teh state for the first
		// cell to be calculated
		this.addToCell(0,0,'nw',0);
		this.submissions[0].forEach((t,i)=>{
			this.addToCell(i,0,'n',0);
		});
		this.submissions[1].forEach((t,i)=>{
			this.addToCell(0,i,'w',0);
		});
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
				if(0 === e.seq % 10000){
					this.db.compact();
				}
				if(e.deleted) return;
				this.calcCell(e.doc);
				if(this.remaining === 0){
					this.filled = true;
				}
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

	addToCell(x,y,orig,score){
		let key = [this.name,x,y].join('.');
		this.db.upsert(key,(doc)=>{
			if(Object.keys(doc).length === 0){
				this.remaining++;
			}
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

			doc[orig] = score;
			return doc;
		});
	}

	calcCell(doc){
		if(!('n' in doc && 'w' in doc && 'nw' in doc)){
			if(!('score' in doc)){
				return;
			}
		}
		this.remaining--;

		let name = doc._id.split('.');
		let y = parseInt(name.pop(),10);
		let x = parseInt(name.pop(),10);
		name = name.join('.');

		let score = doc.score;
		if(typeof score === 'undefined'){
			score = Math.max(doc.n, doc.w, doc.nw);
		}

		this.addToCell(x   , y+1 , 'n' , score );
		this.addToCell(x+1 , y+1 , 'nw', score );
		this.addToCell(x+1 , y   , 'w' , score );

		if('score' in doc){
			return;
		}
		let id = doc._id;
		this.db.upsert(id,(doc)=>{
			console.log("scoring: " + id);
			let orig = JSON.clone(doc);
			doc.score = score;

			//delete doc.n;
			//delete doc.nw;
			//delete doc.w;

			//if(score === 0){
			//	doc._deleted = true;
			//}
			if(utils.docsEqual(doc,orig)){
				return false;
			}
			return doc;
		});
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
