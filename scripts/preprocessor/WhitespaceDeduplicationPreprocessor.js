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
	WhitespaceDeduplicationPreprocessor
};

import {Submission} from '../submission/Submission.js';
import {SubmissionPreprocessor} from '../preprocessor/SubmissionPreprocessor.js';
import {Tokenizer} from '../token/tokenizer/Tokenizer.js';
import {checkNotNull,checkArgument} from '../util/misc.js';


/**
 * Remove duplicated whitespace characters.
 */
class WhitespaceDeduplicationPreprocessor extends SubmissionPreprocessor {

	/**
	 * @return Singleton instance of WhitespaceDeduplicationPreprocessor
	 */
	static getInstance() {
		if(!('instance' in WhitespaceDeduplicationPreprocessor)) {
			WhitespaceDeduplicationPreprocessor.instance = new WhitespaceDeduplicationPreprocessor();
		}
		return WhitespaceDeduplicationPreprocessor.instance;
	}

	/**
	 * Deduplicate whitespace in a submission.
	 *
	 * @param submission Submission to transform
	 * @return Input submission with whitespace deduplicated
	 */
	process(submission) {
		checkNotNull(submission);
		checkArgument(submission instanceof Submission, "'submission' expected to be of type 'Submission'");

		let tabsAndSpacesDedup = submission.getContentAsString().replace(/[ \t]+/g, " ");
		let unixNewlineDedup = tabsAndSpacesDedup.replace(/\n+/g, "\n");
		let windowsNewlineDedup = unixNewlineDedup.replace(/(\r\n)+/g, "\n");

		let tokenizer = Tokenizer.getTokenizer(submission.getTokenType());

		let finalList = tokenizer.splitString(windowsNewlineDedup);

		return new Submission(submission.getName(), windowsNewlineDedup, finalList);
	}

	/**
	 * @return Name of the implementation as it will be seen in the registry
	 */
	getName() {
		return "deduplicate";
	}

	toString() {
		return "Singleton instance of WhitespaceDeduplicationPreprocessor";
	}

	hashCode() {
		return this.getName().hashCode();
	}

	equals(other) {
		return other instanceof WhitespaceDeduplicationPreprocessor;
	}
}
