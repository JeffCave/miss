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
	CommonCodeLineRemovalPreprocessor
};

import {LineSimilarityChecker} from '../algorithm/linesimilarity/LineSimilarityChecker.js';
import {Submission} from '../submission/Submission.js';
import {ValidityIgnoringSubmission} from '../submission/ValidityIgnoringSubmission.js';
import {checkNotNull,checkArgument} from '../util/misc.js';


//PreprocessorRegistry.addPreprocessor('CommonCodeLineRemovalPreprocessor');
/**
 * Create a Common Code Removal preprocessor using Line Compare.
 *
 * @param common Common code to remove
 */
export default function CommonCodeLineRemovalPreprocessor(common){

	checkNotNull(common);
	checkArgument(common instanceof Submission, "Common Code expected to be of type 'Submission'");

	let algorithm = LineSimilarityChecker.getInstance();

	/**
	 * Perform common code removal using Line Comparison.
	 *
	 * @param removeFrom Submission to remove common code from
	 * @return Input submission with common code removed
	 * @throws InternalAlgorithmError Thrown on error removing common code
	 */
	return async function(removeFrom) {
		console.debug("Performing common code removal on submission " + removeFrom.Name);
		if(removeFrom instanceof Promise){
			removeFrom = await removeFrom;
		}

		// Create new submissions with retokenized input
		let computeIn = new Submission(removeFrom);
		let computeCommon = new Submission(common);

		// Use the new submissions to compute this
		let results = await algorithm.detectSimilarity(computeIn, computeCommon);

		// The results contains two TokenLists, representing the final state of the submissions after detection
		// All common code should be marked invalid for the input submission's final list
		let listWithCommonInvalid = results.A.finalList;

		let comparator = new ValidityIgnoringSubmission(computeIn);
		if(comparator.equals(results.B.submission)) {
			listWithCommonInvalid = results.B.finalList;
			//percentMatched = results.percentMatchedB;
			//identTokens = results.identicalTokensB;
		}

		// Recreate the string body of the submission from this new list
		let newBody = {
			'commonCodeRemoved.txt': (async function(){ return listWithCommonInvalid.join(true) })()
		};

		//console.trace("Submission " + removeFrom.getName() + " contained " + percentMatched.toFixed(2) + "% common code");
		//console.trace("Removed " + identTokens + " common tokens (of " + removeFrom.NumTokens + " total)");
		let submission = new Submission(removeFrom.Name, newBody);
		return submission;
	};

}
