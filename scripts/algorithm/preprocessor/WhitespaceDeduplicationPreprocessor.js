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
global Submission
global Submission
global SubmissionPreprocessor
global Tokenizer
global checkNotNull
*/
loader.load([
	,'/scripts/submission/Submission.js'
	,'/scripts/algorithm/preprocessor/SubmissionPreprocessor.js'
	,'/scripts/token/tokenizer/Tokenizer.js'
	,'/scripts/ChecksimsConfig.js'
	,'/scripts/ChecksimsException.js'
	,'/scripts/util/misc.js'
]);

PreprocessorRegistry.addPreprocessor('LowercasePreprocessor');
/**
 * Remove duplicated whitespace characters.
 */
class WhitespaceDeduplicationPreprocessor extends SubmissionPreprocessor {
	constructor() {

	}

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

		let tabsAndSpacesDedup = submission.getContentAsString().replaceAll("[ \t]+", " ");
		let unixNewlineDedup = tabsAndSpacesDedup.replaceAll("\n+", "\n");
		let windowsNewlineDedup = unixNewlineDedup.replaceAll("(\r\n)+", "\r\n");

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
