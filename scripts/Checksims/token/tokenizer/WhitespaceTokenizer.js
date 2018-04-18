'use strict';
import {TokenizerRegistry} from '../../token/TokenizerRegistry.js';
import {newToken} from '../../token/Token.js';
import {checkNotNull} from '../../util/misc.js';

(function(){


let TOKENTYPE = 'whitespace';


/**
 * Split a file into tokens based on spaces.
 */
TokenizerRegistry.processors[TOKENTYPE] = {
	seperator: ' ',
	tokentype: TOKENTYPE,
	split: function(string) {
		checkNotNull(string);

		let toReturn = string
			.split(/\s+/)
			.filter((str) => {
				return str !== "";
			})
			.map((str) => {
				return newToken(str, TOKENTYPE);
			})
			;

		return toReturn;
	}
};


})();
