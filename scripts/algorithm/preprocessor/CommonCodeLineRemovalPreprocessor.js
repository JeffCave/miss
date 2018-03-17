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
import {LineSimilarityChecker} from '/scripts/algorithm/linesimilarity/LineSimilarityChecker.js';
import {Submission} from '/scripts/submission/Submission.js';
import {ValidityIgnoringSubmission} from '/scripts/submission/ValidityIgnoringSubmission.js';
import {TokenList} from '/scripts/token/TokenList.js';
import {TokenType} from '/scripts/token/TokenType.js';
import {Tokenizer} from '/scripts/token/tokenizer/Tokenizer.js';
import {SubmissionPreprocessor} from '/scripts/algorithm/preprocessor/SubmissionPreprocessor.js';
import { ChecksimsException } from '/scripts/ChecksimsException.js';
import { checkNotNull,checkArgument } from '/scripts/util/misc.js';
*/

/*
global LineSimilarityChecker
global Submission
global ValidityIgnoringSubmission
global TokenList
global TokenType
global Tokenizer
global SubmissionPreprocessor
global  ChecksimsException
global  checkNotNull,checkArgument
*/

/**
 * Common Code Removal via Line Comparison.
 */
export class CommonCodeLineRemovalPreprocessor extends SubmissionPreprocessor {

	static get algorithm(){
		if(!('_algorithm' in CommonCodeLineRemovalPreprocessor)){
			CommonCodeLineRemovalPreprocessor._algorithm = LineSimilarityChecker.getInstance();
		}
		return CommonCodeLineRemovalPreprocessor._algorithm;
	}

	/**
	 * @return Dummy instance of CommonCodeLineRemovalPreprocessor with empty common code
	 */
	static getInstance() {
		let tokens = new TokenList(TokenType.CHARACTER);
		let submission = new Submission("Empty","",tokens);
		let instance = new CommonCodeLineRemovalPreprocessor(submission);
		return instance;
	}

	/**
	 * Create a Common Code Removal preprocessor using Line Compare.
	 *
	 * @param common Common code to remove
	 */
	constructor(common) {
		checkNotNull(common);
		this.common = common;
	}

	/**
	 * Perform common code removal using Line Comparison.
	 *
	 * @param removeFrom Submission to remove common code from
	 * @return Input submission with common code removed
	 * @throws InternalAlgorithmError Thrown on error removing common code
	 */
	process(removeFrom) {
		console.debug("Performing common code removal on submission " + removeFrom.getName());

		let type = this.algorithm.getDefaultTokenType();
		let tokenizer = Tokenizer.getTokenizer(type);

		// Re-tokenize input and common code using given token type
		let redoneIn = tokenizer.splitString(removeFrom.getContentAsString());
		let redoneCommon = tokenizer.splitString(this.common.getContentAsString());

		// Create new submissions with retokenized input
		let computeIn = new Submission(removeFrom.getName(), removeFrom.getContentAsString(), redoneIn);
		let computeCommon = new Submission(this.common.getName(), this.common.getContentAsString(), redoneCommon);

		// Use the new submissions to compute this
		let results;

		// This exception should never happen, but if it does, just rethrow as InternalAlgorithmException
		try {
			results = this.algorithm.detectSimilarity(computeIn, computeCommon);
		}
		catch(e) {
			throw new Error(e.getMessage());
		}

		// The results contains two TokenLists, representing the final state of the submissions after detection
		// All common code should be marked invalid for the input submission's final list
		let listWithCommonInvalid = null;
		let percentMatched = null;
		let identTokens = null;
		if(new ValidityIgnoringSubmission(results.a).equals(computeIn)) {
			listWithCommonInvalid = results.finalListA;
			percentMatched = results.percentMatchedA();
			identTokens = results.identicalTokensA;
		}
		else if(new ValidityIgnoringSubmission(results.b).equals(computeIn)) {
			listWithCommonInvalid = results.finalListB;
			percentMatched = results.percentMatchedB();
			identTokens = results.identicalTokensB;
		}
		else {
			throw new Error("Unreachable code!");
		}

		// Recreate the string body of the submission from this new list
		let newBody = listWithCommonInvalid.join(true);

		// Retokenize the new body with the original tokenization
		let oldType = removeFrom.getTokenType();
		let oldTokenizer = Tokenizer.getTokenizer(oldType);
		let finalListGoodTokenization = oldTokenizer.splitString(newBody);

		console.trace("Submission " + removeFrom.getName() + " contained " + percentMatched.toFixed(2) + "% common code");
		console.trace("Removed " + identTokens + " common tokens (of " + removeFrom.getNumTokens() + " total)");

		return new Submission(removeFrom.getName(), newBody, finalListGoodTokenization);
	}

	/**
	 * @return Name of the implementation as it will be seen in the registry
	 */
	getName() {
		return "commoncodeline";
	}

	toString() {
		return "Common Code Line Removal preprocessor, removing common code submission " + this.common.getName();
	}

	hashCode() {
		return this.getName().hashCode() ^ this.common.getName().hashCode();
	}

	equals(other) {
		if(!(other instanceof 'CommonCodeLineRemovalPreprocessor')) {
			return false;
		}
		return other.common.equals(this.common);
	}
}
