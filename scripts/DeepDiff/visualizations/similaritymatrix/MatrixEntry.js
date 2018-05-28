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
export default function MatrixEntry(base, comparedTo) {
		checkNotNull(base);
		checkNotNull(comparedTo);

		let rtn = {};
		rtn.base = base;
		rtn.comparedTo = comparedTo;
		rtn.similarTokens = +base.identicalTokens;
		rtn.totalTokens = +base.totalTokens;
		rtn.similarityPercent = base.percentMatched;
		return rtn;
}
