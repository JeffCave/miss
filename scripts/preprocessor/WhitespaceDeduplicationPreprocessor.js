'use strict';


import {Submission} from '../submission/Submission.js';
import {PreprocessorRegistry} from '../preprocessor/PreprocessorRegistry.js';
import {checkNotNull,checkArgument} from '../util/misc.js';


/**
 * Remove duplicated whitespace characters.
 */

(function(){

PreprocessorRegistry.processors['deduplicate'] = async function(submission) {
	checkNotNull(submission);
	if(submission instanceof Promise){
		submission = await submission;
	}
	checkArgument(submission instanceof Submission, "'submission' expected to be of type 'Submission'");

	let newBody = {
		'whitespaceDeduplicated.txt': (async function(){
			let content = await submission.ContentAsString;
			content = content.replace(/[ \t]+/g, " ");
			content = content.replace(/(\r\n)+/g, "\n");
			content = content.replace(/\n+/g, "\n");
			return content;
		})()
	};

	return new Submission(submission.Name, newBody);

};


})();
