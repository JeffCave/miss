'use strict';

import {PreprocessorRegistry} from './PreprocessorRegistry.js';
import {Submission} from '../submission/Submission.js';
import {checkNotNull} from '../util/misc.js';

(function(){

PreprocessorRegistry.processors['lowercase'] = async function(inbound){
	if(inbound instanceof Promise){
		inbound = await inbound;
	}
	// Lowercase the content of the submission, then retokenize
	// Recreate the string body of the submission from this new list
	inbound = inbound.toLowerCase();
	return inbound;
};

})();
