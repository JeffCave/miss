'use strict';
export {
	NullPreprocessor
};

import {SubmissionPreprocessor} from './SubmissionPreprocessor.js';
import {Submission} from '../submission/Submission.js';
import {Tokenizer} from '../token/tokenizer/Tokenizer.js';
import {checkNotNull} from '../util/misc.js';

/**
 * A dud preprocessor that doesn't actually do anything.
 *
 * Can be used as a place holder to avoid null
 */
export default class NullPreprocessor extends SubmissionPreprocessor {

	/**
	 * @return Singleton instance of LowercasePreprocessor
	 */
	static getInstance() {
		if(!('instance' in NullPreprocessor)) {
			NullPreprocessor.instance = new NullPreprocessor();
		}
		return NullPreprocessor.instance;
	}

	getName() {
		return "null";
	}

	async process(submission) {
		if(submission instanceof Promise){
			submission = await submission;
		}
		return submission;
	}
}
