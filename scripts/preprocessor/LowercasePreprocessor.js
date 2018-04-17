'use strict';

import {PreprocessorRegistry} from './PreprocessorRegistry.js';
import {Submission} from '../submission/Submission.js';
import {checkNotNull} from '../util/misc.js';

(function(){

PreprocessorRegistry.processors['lowercase'] = async function(submission){

	checkNotNull(submission);
	if(submission instanceof Promise){
		submission = await submission;
	}

	// Lowercase the content of the submission, then retokenize
	// Recreate the string body of the submission from this new list
	let newBody = {
		'lowerCased.txt': (async function(){
			let contentLower = await submission.ContentAsString;
			contentLower = contentLower.toLowerCase();
			return contentLower;
		})()
	};


	let sub = new Submission(submission.Name, newBody);
	return sub;
}

})();
