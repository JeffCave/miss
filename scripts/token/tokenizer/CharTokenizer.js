'use strict';
import {newToken}     from '../Token.js';
import {TokenizerRegistry} from '../TokenizerRegistry.js';
import {TokenList} from '../TokenList.js';

import {checkNotNull} from '../../util/misc.js';


(function(){

let TOKENTYPE = TokenList.TokenTypes.CHARACTER;

/**
 * Split a file into a list of character tokens.
 */
TokenizerRegistry.processors[TOKENTYPE] = {
	seperator: '',
	split: function(content) {
		checkNotNull(content);

		let tokens = content.split('')
			.map((character) => {
				return newToken(character, TOKENTYPE);
			});

		let toReturn = new TokenList(TOKENTYPE,tokens);
		return toReturn;
	}
};

})();
