'use strict';


import {Submission} from '../submission/Submission.js';
import {PreprocessorRegistry} from '../preprocessor/PreprocessorRegistry.js';
import {checkNotNull,checkArgument} from '../util/misc.js';


/**
 * Remove duplicated whitespace characters.
 */

(function(){

PreprocessorRegistry.processors['deduplicate'] = async function(inbound) {
	checkNotNull(inbound);
	if(inbound instanceof Promise){
		inbound = await inbound;
	}
	let content = inbound;
	content = content.replace(/[ \t]+/g, " ");
	content = content.replace(/(\r\n)+/g, "\n");
	content = content.replace(/\n+/g, "\n");
	return content;
};


})();
