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
 *
 * CDDL HEADER END
 *
 * Copyright (c) 2014-2015 Nicholas DeMarinis, Matthew Heon, and Dolan Murvihill
 */
'use strict';

/*
global loader
global NamedInstantiable
*/
loader.load([
	'/scripts/util/reflection/NamedInstantiable.js',
]);


/**
 * Detect similarities between two submissions.
 *
 * NOTE that, in addition to the methods listed here, all plagiarism detectors MUST support a no-arguments getInstance()
 * method, and be contained in edu.wpi.checksims.algorithm or a subpackage thereof.
 *
 * This is required as reflection is used to automatically detect and instantiate all similarity detection algorithms
 * present at runtime.
 */
class SimilarityDetector extends NamedInstantiable {
	constructor(){
		throw new Error("Implementation of abstract class");
	}

	/**
	 * @return Default token type to be used for this similarity detector
	 */
	getDefaultTokenType(){
		throw new Error("Implement this class");
	}

	/**
	 * Apply a pairwise similarity detection algorithm.
	 *
	 * Token list types of A and B must match
	 *
	 * @param a First submission to apply to
	 * @param b Second submission to apply to
	 * @return Similarity results of comparing submissions A and B
	 * @throws TokenTypeMismatchException Thrown on comparing two submissions with different token types
	 * @throws InternalAlgorithmError Thrown on error detecting similarities
	 */
	detectSimilarity(a, b){
		throw new Error("Implement this class");
	}
}
