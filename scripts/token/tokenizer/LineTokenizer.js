'use strict';
import {newToken} from '../../token/Token.js';
import {TokenizerRegistry} from '../../token/TokenizerRegistry.js';
import {TokenList} from '../../token/TokenList.js';
import {checkNotNull} from '../../util/misc.js';

(function(){

const TOKENTYPE = TokenList.TokenTypes.LINE;

/**
 * Split string into newline-delineated tokens.
 *
 * @param string String to split
 * @return List of LINE tokens representing the input string
 */
TokenizerRegistry.processors[TOKENTYPE] = {
	seperator: '\n',
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
