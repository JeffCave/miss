'use strict';

/*
global performance
*/

import {AlgorithmRegistry} from '../../algorithm/AlgorithmRegistry.js';
import * as AlgorithmResults from '../../algorithm/AlgorithmResults.js';
import {checkNotNull} from '../../util/misc.js';
import {SmithWaterman} from '../../algorithm/smithwaterman/SmithWatermanAlgorithm.js';

(function(){

const largeCompare = (1024**3)*4;
const threads = {};


/**
 * Apply the Smith-Waterman algorithm to determine the similarity between two submissions.
 *
 * Token list types of A and B must match
 *
 * @param a First submission to apply to
 * @param b Second submission to apply to
 * @return Similarity results of comparing submissions A and B
 */
AlgorithmRegistry.processors['smithwaterman'] = async function(req, progHandler=()=>{}) {
	checkNotNull(req);

	if(req.action === 'stop'){
		if(req.name in threads){
			let thread = threads[req.name];
			thread.stop();
		}
		return null;
	}

	performance.mark('smithwaterman-start.'+req.name);

	let a = req.submissions[0];
	let b = req.submissions[1];

	let aTokens = a.finalList;
	let bTokens = b.finalList;

	//console.debug('Creating a SmithWaterman for ' + a.Name + ' and ' + b.Name);

	// Test for token type mismatch
	if(aTokens.type !== bTokens.type) {
		throw new Error("Token list type mismatch: submission " + a.Name + " has type " +
			aTokens.type + ", while submission " + b.Name + " has type "
			+ bTokens.type);
	}

	//let aText = await a.ContentAsString;
	//let bText = await b.ContentAsString;
	//console.debug(aText);
	//console.debug(bText);

	// Handle a 0-token submission (no similarity)
	if(aTokens.length === 0 || bTokens.length === 0) {
		//TODO: return req
		let result = await AlgorithmResults.Create(a, b, aTokens, bTokens, {error:'0 token submission'});
		result.complete = result.totalTokens;
		return result;
	}

	let notes = {
		algorithm: 'smithwaterman'
	};
	if(aTokens.length * bTokens.length > largeCompare){
		notes.isMassive = true;
	}

	// Alright, easy cases taken care of. Generate an instance to perform the actual algorithm
	let endLists = await new Promise((resolve,reject)=>{
		let thread = new SmithWaterman(req.name,aTokens, bTokens);
		threads[req.name] = thread;
		thread.onmessage = function(msg){
			let handler = progHandler;
			switch(msg.type){
				case 'progress':
					handler = progHandler;
					break;
				default:
					handler = resolve;
					thread.onmessage = null;
					thread.stop();
					thread = null;
					delete threads[req.name];
					break;
			}
			handler(msg);
		};
		thread.start();
	});


	performance.mark('smithwaterman-end.'+req.name);
	performance.measure('smithwaterman.'+req.name,'smithwaterman-start.'+req.name,'smithwaterman-end.'+req.name);
	let perf = performance.getEntriesByName('smithwaterman.'+req.name);
	notes.duration = JSON.stringify(perf.pop());

	if(endLists.type === 'stopped'){
		return null;
	}

	let results = await AlgorithmResults.Create(a, b, endLists.data[0], endLists.data[1], notes);
	results.complete = results.totalTokens;

	return results;
};


})();
