'use strict';

/*
global performance
*/

import {AlgorithmRegistry} from '../../algorithm/AlgorithmRegistry.js';
import * as AlgorithmResults from '../../algorithm/AlgorithmResults.js';
import {checkNotNull} from '../../util/misc.js';

//import {swAlgoCell as SmithWaterman} from './swAlgoCell.js';
import {swAlgoGpu as SmithWaterman} from './swAlgoGpu.js';

(function(){


const threads = {};

const scores = {
	// an exact positional match (diagonal in SmithWaterman terms). This is
	// the highest possible match.
	match:+2,
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
			thread.postMessage(JSON.clone({ action:'stop', name:req.name }));
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
	if(aTokens.length * bTokens.length > SmithWaterman.MAXAREA){
		notes.isMassive = true;
	}

	// Alright, easy cases taken care of. Generate an instance to perform the actual algorithm
	let endLists = await new Promise((resolve,reject)=>{
		let thread = new SmithWaterman(req.name, aTokens, bTokens, {scores:scores});
		threads[req.name] = thread;
		thread.onmessage = function(msg){
			let handler = progHandler;
			switch(msg.type){
				// don't care
				case 'progress':
				case 'pause':
					handler = progHandler;
					break;
				// ERROR!! Post a message and then terminate processing
				case 'error':
				default:
					console.error(msg);
					thread.stop();
					break;
				// Done. Terminate processing
				case 'stop':
				case 'complete':
					handler = resolve;
					thread.terminate();
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
	notes.duration = perf.pop();

	if(endLists.type !== 'complete'){
		return null;
	}

	endLists = endLists.data.submissions;
	let results = await AlgorithmResults.Create(a, b, endLists[0], endLists[1], notes);
	results.complete = results.totalTokens;

	return results;
};


})();
