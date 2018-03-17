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

import { checkNotNull, checkArgument } from '/scripts/util/misc.js';

/**
 * Apply a preprocessor (maps Submission to Submission) to a given list of submissions.
 */
export class PreprocessSubmissions {
	constructor() {

	}

	/**
	 * Apply a given mapping function to each submission in a list of submissions.
	 *
	 * Is NOT expected to preserve tokenization validity, as these are to be applied before that is significant
	 *
	 * @param preprocessor Preprocessor to apply. SHOULD NOT MUTATE THE EXISTING TOKENS
	 * @param submissions Input list of submissions to apply to
	 * @return New list formed by applying the mapping function to each submission. Retains order of input list.
	 */
	static process(preprocessor, submissions){
		checkNotNull(preprocessor);
		checkNotNull(submissions);

		checkArgument(submissions instanceof 'Submission',"Expected instance of 'submission'");
		checkArgument(preprocessor instanceof 'SubmissionPreprocessor',"Expected instance of 'SubmissionPreprocessor'");

		console.log("Preprocessing " + submissions.size() + " submissions with preprocessor " + preprocessor.getName());

		// Map the submissions to PreprocessorWorker instances
		let processed = submissions
			.map(function(submission){
				return preprocessor.process(submission);
			})
			;

		return processed;
	}
}
