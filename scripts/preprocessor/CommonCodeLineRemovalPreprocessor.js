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
loader.load([
	,'/scripts/algorithm/linesimilarity/LineSimilarityChecker.js'
	,'/scripts/submission/Submission.js'
	,'/scripts/submission/ValidityIgnoringSubmission.js'
	,'/scripts/token/TokenList.js'
	,'/scripts/token/TokenType.js'
	,'/scripts/token/tokenizer/Tokenizer.js'
	,'/scripts/algorithm/preprocessor/SubmissionPreprocessor.js'
	,'/scripts/ChecksimsException.js'
	,'/scripts/util/misc.js'
]);


//PreprocessorRegistry.addPreprocessor('CommonCodeLineRemovalPreprocessor');
/**
 * Common Code Removal via Line Comparison.
 */
class CommonCodeLineRemovalPreprocessor extends SubmissionPreprocessor {

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
		let submission = Submission.NullSubmission;
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
		checkArgument(common instanceof Submission, "Common Code expected to be of type 'Submission'");
		super();
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

		// Create new submissions with retokenized input
		let computeIn = new Submission(removeFrom);
		let computeCommon = new Submission(this.common);

		// Use the new submissions to compute this
		let results = CommonCodeLineRemovalPreprocessor.algorithm.detectSimilarity(computeIn, computeCommon);

		// The results contains two TokenLists, representing the final state of the submissions after detection
		// All common code should be marked invalid for the input submission's final list
		let listWithCommonInvalid = results.finalListA;
		let percentMatched = results.percentMatchedA;
		let identTokens = results.identicalTokensA;

		let comparator = new ValidityIgnoringSubmission(computeIn);
		if(comparator.equals(results.b)) {
			listWithCommonInvalid = results.finalListB;
			percentMatched = results.percentMatchedB;
			identTokens = results.identicalTokensB;
		}

		// Recreate the string body of the submission from this new list
		let newBody = listWithCommonInvalid.join(true);

		// Retokenize the new body with the original tokenization
		let oldType = removeFrom.getTokenType();
		let oldTokenizer = Tokenizer.getTokenizer(oldType);
		let finalListGoodTokenization = oldTokenizer.splitString(newBody);

		//console.trace("Submission " + removeFrom.getName() + " contained " + percentMatched.toFixed(2) + "% common code");
		//console.trace("Removed " + identTokens + " common tokens (of " + removeFrom.getNumTokens() + " total)");

		let submission = new Submission(removeFrom.getName(), newBody, finalListGoodTokenization);
		return submission;
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
		return hashCode(this.getName()) ^ hashCode(this.common.getName());
	}

	equals(other) {
		if(!(other instanceof 'CommonCodeLineRemovalPreprocessor')) {
			return false;
		}
		return other.common.equals(this.common);
	}
}
