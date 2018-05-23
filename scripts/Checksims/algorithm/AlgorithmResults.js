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
export default async function AlgorithmResults(a, b, finalListA, finalListB, notes) {
	checkNotNull(a);
	checkNotNull(b);

	let results = [
			{submission: a, finalList: finalListA},
			{submission: b, finalList: finalListB}
		]
		.sort(function(a,b){
			let comp = a.submission.name.localeCompare(b.submission.name);
			return comp;
		});

	results.name = [a.name,b.name].sort().join('.');
	results.hash = hasher(await a.hash + await b.hash);
	results.complete = 0;

	if(notes){
		Object.entries(notes).forEach(function(d){
			results[d[0]] = d[1];
		});
	}

	results.percentMatched=0;
	for(let r = 0; r<results.length; r++){
		let d = results[r];
		if(!d.finalList){
			d.finalList = new TokenList('mixed',[]);
		}
		d.finalList = await TokenList.cloneTokenList(d.finalList);

		d.identicalTokens = Array.from(d.finalList).reduce((sum,token)=>{
			sum = sum + (!token.valid);
			return sum;
		},0);

		let totalTokens = await d.submission.totalTokens;
		let pct = (totalTokens === 0) ? 0 : d.identicalTokens / totalTokens;
		d.percentMatched = pct;

		results[String.fromCharCode(r+65)] = d;
		results.percentMatched += d.percentMatched;
	}
	results.percentMatched /= results.length;

	results.toJSON = function(){
		let json = {
			name:this.name,
			hash:this.hash,
			complete:this.complete,
			percentMatched:this.percentMatched,
		};
		return json;
	};

	return results;
}
