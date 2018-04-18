'use strict';
export {
	PreprocessorRegistry
};

/**
 * Registry to obtain valid preprocessors.
 */
const PreprocessorRegistry = {
	def : 'null',
	processors: {
		'null' :  async function(inbound){
			inbound = inbound.slice(0);
			return inbound;
		}
	}
};


PreprocessorRegistry.def = PreprocessorRegistry.processors['null'];
