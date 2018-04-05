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

/*
global loader
global checkNotNull, checkArgument
*/
loader.load([

]);
/**
 * Results for a pairwise comparison algorithm.
 */
class AlgorithmResults {

	/**
	 * Construct results for a pairwise similarity detection algorithm.
	 *
	 * @param a First submission compared
	 * @param b Second submission compared
	 * @param finalListA Token list from submission A, with matched tokens set invalid
	 * @param finalListB Token list from submission B, with matched tokens set invalid
	 */
	constructor(a, b, finalListA, finalListB) {
		checkNotNull(a);
		checkNotNull(b);
		checkNotNull(finalListA);
		checkNotNull(finalListB);
		checkArgument(a.getNumTokens() === finalListA.length,
			"Token size mismatch when creating algorithm results for submission \"" + a.getName()
			+ "\" --- expected " + a.getNumTokens() + ", got " + finalListA.length);
		checkArgument(b.getNumTokens() === finalListB.length,
			"Token size mismatch when creating algorithm results for submission \"" + b.getName()
			+ "\" --- expected " + b.getNumTokens() + ", got " + finalListB.length);

		this.a = a;
		this.b = b;
		this.finalListA = TokenList.cloneTokenList(finalListA);
		this.finalListB = TokenList.cloneTokenList(finalListB);

		this.identicalTokensA = Array.from(this.finalListA).filter((token) => !token.isValid()).length;
		this.identicalTokensB = Array.from(this.finalListB).filter((token) => !token.isValid()).length;

		if(a.getNumTokens() === 0) {
			this.percentMatchedA = 0.0;
		}
		else {
			this.percentMatchedA = this.identicalTokensA / a.getNumTokens();
		}

		if(b.getNumTokens() === 0) {
			this.percentMatchedB = 0.0;
		}
		else {
			this.percentMatchedB = this.identicalTokensB / b.getNumTokens();
		}
	}

	/**
	 * @return Percentage similarity of submission A to submission B. Represented as a double from 0.0 to 1.0 inclusive
	 */
	getPercentMatchedA() {
		return this.percentMatchedA;
	}

	/**
	* @return Percentage similarity of submission B to submission A. Represented as a double from 0.0 to 1.0 inclusive
	*/
	getPercentMatchedB() {
		return this.percentMatchedB;
	}

	toString() {
		return "Similarity results for submissions named " + this.a.getName() + " and " + this.b.getName();
	}

	equals(other) {
		if(!(other instanceof AlgorithmResults)) {
			return false;
		}

		let isEqual =
			this.a.equals(other.a)
			&& this.b.equals(other.b)
			&& this.finalListA.equals(other.finalListA)
			&& this.finalListB.equals(other.finalListB)
			;
		return isEqual;
	}

	hashCode() {
		return this.a.hashCode() ^ this.b.hashCode();
	}
}
