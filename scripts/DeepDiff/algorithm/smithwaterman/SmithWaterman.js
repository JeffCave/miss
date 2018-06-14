'use strict';

/*
global performance
*/

import {AlgorithmRegistry} from '../../algorithm/AlgorithmRegistry.js';
import * as AlgorithmResults from '../../algorithm/AlgorithmResults.js';
import {TokenList} from '../../token/TokenList.js';
import {SmithWatermanCompare} from '../../algorithm/smithwaterman/SmithWatermanFast.js';
import {checkNotNull} from '../../util/misc.js';

(function(){


/**
 * Apply the Smith-Waterman algorithm to determine the similarity between two submissions.
 *
 * Token list types of A and B must match
 *
 * @param a First submission to apply to
 * @param b Second submission to apply to
 * @return Similarity results of comparing submissions A and B
 */
AlgorithmRegistry.processors['smithwaterman'] = async function(req) {
	checkNotNull(req);

	performance.mark('smithwaterman-start.'+req.name);

	let a = req.submissions[0];
	let b = req.submissions[1];

	let aTokens = await a.ContentAsTokens;
	let bTokens = await b.ContentAsTokens;

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
		return AlgorithmResults(a, b, aTokens, bTokens);
	}

	// Handle identical submissions
	if(await a.equals(b)) {
		let aInval = await TokenList.cloneTokenList(aTokens);
		aInval.forEach((token) => token.setValid(false));
		return AlgorithmResults(a, b, aInval, aInval);
	}

	// Alright, easy cases taken care of. Generate an instance to perform the actual algorithm
	let endLists = await SmithWatermanCompare(req.name, aTokens, bTokens);

	let notes = {
		algorithm: 'smithwaterman'
	};
	if(endLists.massive){
		notes.error = 'Massive compare';
	}

	let results = await AlgorithmResults.Create(a, b, endLists[0], endLists[1], notes);
	results.complete = results.totalTokens;

	performance.mark('smithwaterman-end.'+req.name);
	performance.measure('smithwaterman.'+req.name,'smithwaterman-start.'+req.name,'smithwaterman-end.'+req.name);
	let perf = performance.getEntriesByName('smithwaterman.'+req.name);
	results.duration = JSON.stringify(perf.pop());


	return results;
};


})();
