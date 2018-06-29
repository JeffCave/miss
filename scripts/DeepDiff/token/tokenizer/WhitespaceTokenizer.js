'use strict';

import {LexemeMap} from '../../token/LexemeMap.js';
import {TokenizerRegistry} from '../../token/TokenizerRegistry.js';
import {TokenList} from '../TokenList.js';
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

		let tokens = string
			.split(/\s+/)
			.filter((str) => {
				return str !== "";
			})
			.map((str) => {
				return LexemeMap.CreateToken(str, TOKENTYPE);
			})
			;

		let toReturn = new TokenList(TOKENTYPE,tokens);
		return toReturn;
	}
};


})();
