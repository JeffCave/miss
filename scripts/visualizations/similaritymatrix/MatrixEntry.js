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
	MatrixEntry
};

import {checkNotNull,checkArgument} from '../../util/misc.js';

/**
 * An entry in the Similarity Matrix.
 */
	/**
	 * Construct a Similarity Matrix entry.
	 *
	 * @param base Submission we are reporting relative to
	 * @param comparedTo Submission being compared to
	 * @param similarTokens Number of tokens shared by both submissions
	 */
export default async function MatrixEntry(base, comparedTo, similarTokens) {
		checkNotNull(base);
		checkNotNull(comparedTo);
		checkArgument(similarTokens >= 0, "There cannot be a negative number of similar tokens");

		let baseTokens = await base.ContentAsTokens();
		// DEBUG: put this back
		//checkArgument(similarTokens <= baseTokens.length, "Attempted to created MatrixEntry with " + similarTokens + " similar tokens --- only " + baseTokens.length + " tokens in base!");

		let rtn = {};

		rtn.base = base;
		rtn.comparedTo = comparedTo;
		rtn.similarTokens = +similarTokens;
		rtn.totalTokens = baseTokens.length;
		rtn.similarityPercent = 0.0;

		if(rtn.totalTokens > 0) {
			rtn.similarityPercent = similarTokens / rtn.totalTokens;
		}
		return rtn;
}
