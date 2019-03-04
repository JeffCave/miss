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

import '../algorithm/linesimilarity/LineSimilarityChecker.js';
import {AlgorithmRegistry} from '../algorithm/AlgorithmRegistry.js';
import {Submission} from '../submission/Submission.js';
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

	let algorithm = AlgorithmRegistry.processors["linecompare"];


	if(common.Name === 'null'){
		return async function(inbound) {
			return ""+inbound;
		};
	}

	/**
	 * Perform common code removal using Line Comparison.
	 *
	 * @param removeFrom Submission to remove common code from
	 * @return Input submission with common code removed
	 * @throws InternalAlgorithmError Thrown on error removing common code
	 */
	return async function(inbound) {
		console.debug("Performing common code removal ");

		if(inbound instanceof Promise){
			inbound = await inbound;
		}

		console.warn('Common code removal non-functional');
		return inbound;

		// Create new submissions with retokenized input
		let computeIn = new Submission("temp",{
			"temp.txt": new Promise(function(){ return inbound; })
		});

		// Use the new submissions to compute this
		let results = await algorithm(computeIn, common);

		// The results contains two TokenLists, representing the final state of the submissions after detection
		// All common code should be marked invalid for the input submission's final list
		let listWithCommonInvalid = results.A.finalList;

		let comparator = new ValidityIgnoringSubmission(computeIn);
		if(comparator.equals(results.B.submission)) {
			listWithCommonInvalid = results.B.finalList;
		}

		// Recreate the string body of the submission from this new list
		let content = listWithCommonInvalid.join(true);
		return content;
	};

}
