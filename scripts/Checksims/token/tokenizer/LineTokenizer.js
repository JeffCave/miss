'use strict';
import {newToken} from '../../token/Token.js';
import {TokenizerRegistry} from '../../token/TokenizerRegistry.js';
import {TokenList} from '../../token/TokenList.js';
import {checkNotNull} from '../../util/misc.js';

(function(){

const TOKENTYPE = 'line';

/**
 * Split string into newline-delineated tokens.
 *
 * @param string String to split
 * @return List of LINE tokens representing the input string
 */
TokenizerRegistry.processors[TOKENTYPE] = {
	seperator: '\n',
	tokentype: TOKENTYPE,
	split: function(content) {
		checkNotNull(content);
		let tokens = content
			.split("\n")
			.filter(function(str){
				return str !== '';
			})
			.map((str) => {
				str = str.trim();
				let token = newToken(str, TOKENTYPE);
				return token;
			})
			;
		let toReturn = new TokenList(TOKENTYPE,tokens);
		return toReturn;
	}
};


})();
