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
 * When distributing Covered Code, include this CDDL HEADER in each
 * file and include the License file at LICENSE.txt.
 * If applicable, add the following below this CDDL HEADER, with the
 * fields enclosed by brackets "[]" replaced with your own identifying
 * information: Portions Copyright [yyyy] [name of copyright owner]
 *
 * CDDL HEADER END
 *
 * Copyright (c) 2014-2015 Nicholas DeMarinis, Matthew Heon, and Dolan Murvihill
 */
'use strict';
export {
	AlgorithmRunner
};

import {SimilarityDetector} from './SimilarityDetector.js';
import {checkNotNull,checkArgument} from '../util/misc.js';

/**
 * Run a pairwise similarity detection algorithm on a number of submission pairs.
 */
export default class AlgorithmRunner {
	constructor() {}

	/**
	 * Run a pairwise similarity detection algorithm.
	 *
	 * @param submissions Pairs to run on
	 * @param algorithm Algorithm to use
	 * @return Collection of AlgorithmResults, one for each input pair
	 */
	static runAlgorithm(submissions,algorithm) {
		checkNotNull(submissions);
		checkArgument(submissions instanceof Array, "`submissions` must be instance of `Array`");
		checkArgument(submissions.length > 0, "Must provide at least one pair of submissions to run on!");
		checkNotNull(algorithm);
		checkArgument(algorithm instanceof SimilarityDetector, "algorithm must be a SimilarityDetector");

		console.log("Performing similarity detection on " + submissions.length + " pairs using algorithm " + algorithm.getName());

		// Perform parallel analysis of all submission pairs to generate a results list
		let results = submissions.map(function(pair){
			return algorithm.detectSimilarity(pair[0], pair[1]);
		})
		;

		return results;
	}
}
