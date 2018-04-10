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
	LowercasePreprocessor
};

import {SubmissionPreprocessor} from './SubmissionPreprocessor.js';
import {Submission} from '../submission/Submission.js';
import {Tokenizer} from '../token/tokenizer/Tokenizer.js';
import {checkNotNull} from '../util/misc.js';

/**
 * Lowercases tokens to prevent case from interfering with comparisons.
 */
export default class LowercasePreprocessor extends SubmissionPreprocessor {

	/**
	 * @return Singleton instance of LowercasePreprocessor
	 */
	static getInstance() {
		if(!('instance' in LowercasePreprocessor)) {
			LowercasePreprocessor.instance = new LowercasePreprocessor();
		}
		return LowercasePreprocessor.instance;
	}

	getName() {
		return "lowercase";
	}

	process(submission) {
		checkNotNull(submission);

		let tokenizer = Tokenizer.getTokenizer(submission.TokenType);
		// Lowercase the content of the submission, then retokenize
		let contentLower = submission.ContentAsString.toLowerCase();
		let tokenizedLower = tokenizer.splitString(contentLower);

		return new Submission(submission.Name, contentLower, tokenizedLower);
	}

	toString() {
		return "Singleton instance of LowercasePreprocessor";
	}

	hashCode() {
		return Number.parseInt(this.getName().hashCode(),10);
	}

	equals(other) {
		return other instanceof LowercasePreprocessor;
	}
}
