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

import AlgorithmResults from '/scripts/algorithm/AlgorithmResults.js';
import SimilarityDetector from '/scripts/algorithm/SimilarityDetector.js';
import TokenList from '/scripts/token/TokenList.js';
import SmithWatermanAlgorithm from '/scripts/algorithm/smithwaterman/SmithWatermanAlgorithm.js';
import checkNotNull from '/scripts/util/misc.js';

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
	 * @return Default token type to be used for this similarity detector
	 */
	getDefaultTokenType() {
		return TokenList.TokenType.WHITESPACE;
	}

	/**
	 * Apply the Smith-Waterman algorithm to determine the similarity between two submissions.
	 *
	 * Token list types of A and B must match
	 *
	 * @param a First submission to apply to
	 * @param b Second submission to apply to
	 * @return Similarity results of comparing submissions A and B
	 * @throws TokenTypeMismatchException Thrown on comparing submissions with mismatched token types
	 * @throws InternalAlgorithmError Thrown on internal error
	 */
	detectSimilarity(a, b) {
		checkNotNull(a);
		checkNotNull(b);

		// Test for token type mismatch
		if(!a.getTokenType() === b.getTokenType()) {
			throw new Error("Token list type mismatch: submission " + a.getName() + " has type " +
				a.getTokenType().toString() + ", while submission " + b.getName() + " has type "
				+ b.getTokenType().toString());
		}

		// Handle a 0-token submission (no similarity)
		if(a.getNumTokens() === 0 || b.getNumTokens() === 0) {
			return new AlgorithmResults(a, b, a.getContentAsTokens(), b.getContentAsTokens());
		}
		else if(a.equals(b)) {
			// Handle identical submissions
			let aInval = TokenList.cloneTokenList(a.getContentAsTokens());
			aInval.forEach((token) => token.setValid(false));
			return new AlgorithmResults(a, b, aInval, aInval);
		}

		// Alright, easy cases taken care of. Generate an instance to perform the actual algorithm
		let algorithm = new SmithWatermanAlgorithm(a.getContentAsTokens(), b.getContentAsTokens());

		let endLists = algorithm.computeSmithWatermanAlignmentExhaustive();

		let results = new AlgorithmResults(a, b, endLists[0], endLists[1]);
		return results;
	}

	toString() {
		return "Singleton instance of Smith-Waterman Algorithm";
	}

	hashCode() {
		return this.getName().hashCode();
	}

	equals(other) {
		return other instanceof SmithWaterman;
	}
}
