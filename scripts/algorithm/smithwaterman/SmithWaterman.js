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
	SmithWaterman
};

import AlgorithmResults from '../../algorithm/AlgorithmResults.js';
import SimilarityDetector from '../../algorithm/SimilarityDetector.js';
import TokenList from '../../token/TokenList.js';
import SmithWatermanAlgorithm from '../../algorithm/smithwaterman/SmithWatermanAlgorithm.js';
import checkNotNull from '../../util/misc.js';

/**
 * Implementation of the Smith-Waterman algorithm.
 */
export default class SmithWaterman extends SimilarityDetector {
	/**
	 * @return Singleton instance of the Smith-Waterman algorithm
	 */
	static getInstance() {
		if(!('instance' in SmithWaterman)) {
			SmithWaterman.instance = new SmithWaterman();
		}

		return SmithWaterman.instance;
	}

	/**
	* @return Name of this implementation
	*/
	getName() {
		return "smithwaterman";
	}

	/**
	 * Apply the Smith-Waterman algorithm to determine the similarity between two submissions.
	 *
	 * Token list types of A and B must match
	 *
	 * @param a First submission to apply to
	 * @param b Second submission to apply to
	 * @return Similarity results of comparing submissions A and B
	 */
	async detectSimilarity(a, b) {
		checkNotNull(a);
		checkNotNull(b);

		let aTokens = await a.ContentAsTokens;
		let bTokens = await b.ContentAsTokens;

		// Test for token type mismatch
		if(aTokens.type !== bTokens.type) {
			throw new Error("Token list type mismatch: submission " + a.Name + " has type " +
				aTokens.type + ", while submission " + b.Name + " has type "
				+ bTokens.type);
		}

		let aText = await a.ContentAsString;
		let bText = await b.ContentAsString;
		console.debug(aText);
		console.debug(bText);

		// Handle a 0-token submission (no similarity)
		if(aTokens.length === 0 || aTokens.length === 0) {
			return AlgorithmResults(a, b, aTokens, bTokens);
		}

		// Handle identical submissions
		if(await a.equals(b)) {
			let aInval = await TokenList.cloneTokenList(aTokens);
			aInval.forEach((token) => token.setValid(false));
			return AlgorithmResults(a, b, aInval, aInval);
		}

		// Alright, easy cases taken care of. Generate an instance to perform the actual algorithm
		let algorithm = new SmithWatermanAlgorithm(aTokens, bTokens);

		let endLists = algorithm.computeSmithWatermanAlignmentExhaustive();

		let results = AlgorithmResults(a, b, endLists[0], endLists[1]);
		return results;
	}

}
