'use strict';
export {
	Create,
	toJSON
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
export default async function Create(a, b, finalListA = null, finalListB = null, notes = null) {
	if(a.type === 'result'){
		return a;
	}

	checkNotNull(a);
	checkNotNull(b);

	let results = {};
	results.submissions = [
			{submission: a, finalList: finalListA},
			{submission: b, finalList: finalListB}
		]
		.map((d)=>{
			return {
				submission: d.submission.name,
				name : d.submission.name,
				totalTokens : d.submission.totalTokens,
				hash: d.submission.hash,
				finalList: d.finalList
			};
		})
		.sort(function(a,b){
			let comp = a.submission.localeCompare(b.submission);
			return comp;
		})
		;

	results.hash = hasher(a.hash + b.hash);
	results.complete = 0;

	if(notes){
		Object.entries(notes).forEach(function(d){
			results[d[0]] = d[1];
		});
	}

	results.name = [];
	results.totalTokens = 0;
	results.percentMatched=0;
	for(let r = 0; r<results.submissions.length; r++){
		let d = results.submissions[r];
		if(!d.finalList){
			d.finalList = new TokenList('mixed',[]);
		}
		d.finalList = await TokenList.cloneTokenList(d.finalList);
		d.totalTokens = await d.totalTokens;

		d.identicalTokens = Array.from(d.finalList).reduce((sum,token)=>{
			sum = sum + (!token.valid);
			return sum;
		},0);

		let pct = (d.totalTokens === 0) ? 0 : d.identicalTokens / d.totalTokens;
		d.percentMatched = pct;

		//results[String.fromCharCode(r+65)] = d;
		results.percentMatched += d.percentMatched;
		results.totalTokens += d.totalTokens;
		results.name.push(d.submission);
	}
	results.percentMatched /= results.submissions.length;
	results.name = results.name.join('.');

	return results;
}

function toJSON(result){
	let json = JSON.clone(result);
	json.type = 'result';
	return json;
}

