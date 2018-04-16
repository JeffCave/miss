/*
 * CDDL HEADER START
 *
 * The contents of this file are subject to the terms of the
 * Common Development and Distribution License (the "License").
 * You may not use this file except in compliance with the License.
 *
 * See LICENSE.txt included in this distribution for the specific
 * language governing permissions and limitations under the License.
 *
 * CDDL HEADER END
 *
 * Copyright (c) 2014-2015 Nicholas DeMarinis, Matthew Heon, and Dolan Murvihill
 */
'use strict';
export {
	AlgorithmResults
};

import {TokenList} from '../token/TokenList.js';
import {checkNotNull,hasher} from '../util/misc.js';

/**
 * Results for a pairwise comparison algorithm.
 */

	/**
	 * Construct results for a pairwise similarity detection algorithm.
	 *
	 * @param a First submission compared
	 * @param b Second submission compared
	 * @param finalListA Token list from submission A, with matched tokens set invalid
	 * @param finalListB Token list from submission B, with matched tokens set invalid
	 */
export default async function AlgorithmResults(a, b, finalListA, finalListB) {
	checkNotNull(a);
	checkNotNull(b);
	checkNotNull(finalListA);
	checkNotNull(finalListB);
	/*
	 * No longer actually know how many tokens are in the submissions. The actual token lists would need to be resolved, and we haven't done that yet (still promises)
	 *
	checkArgument(a.NumTokens === finalListA.length,
		"Token size mismatch when creating algorithm results for submission \"" + a.Name
		+ "\" --- expected " + a.NumTokens + ", got " + finalListA.length);
	checkArgument(b.NumTokens === finalListB.length,
		"Token size mismatch when creating algorithm results for submission \"" + b.Name
		+ "\" --- expected " + b.NumTokens + ", got " + finalListB.length);
	*/

	let results = [
			{submission: a, finalList: finalListA},
			{submission: b, finalList: finalListB}
		]
		.sort(function(a,b){
			let comp = a.submission.Name.localeCompare(b.submission.Name);
			return comp;
		});

	results.percentMatched=0;
	for(let r = 0; r<results.length; r++){
		let d = results[r];
		d.finalList = await TokenList.cloneTokenList(d.finalList);

		d.identicalTokens = Array.from(d.finalList).reduce((sum,token)=>{
			sum = sum +	(!token.valid);
			return sum;
		},0);

		let subTokens = await d.submission.ContentAsTokens;
		let pct = (subTokens.length === 0) ? 0 : d.identicalTokens / subTokens.length;
		d.percentMatched = pct;

		results[String.fromCharCode(r+65)] = d;
		results.percentMatched += d.percentMatched;
	}
	results.percentMatched /= results.length;

	results.hash = hasher(await a.hash + await b.hash);

	return results;
}
