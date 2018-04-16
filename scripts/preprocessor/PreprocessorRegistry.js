'use strict';
export {
	PreprocessorRegistry
};

/**
 * Registry to obtain valid preprocessors.
 */
const PreprocessorRegistry = {
	def : 'null',
	processors: []
};


PreprocessorRegistry.processors['null'] = async function(submission){
	if(submission instanceof Promise){
		submission = await submission;
	}
	return submission;
};


PreprocessorRegistry.def = PreprocessorRegistry.processors['null'];
