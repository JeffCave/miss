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
	split: function(string, name='') {
		checkNotNull(string);

		let tokens = string
			.split(/\s+/)
			.filter((str) => {
				return str !== "";
			})
			.map((str,i) => {
				return LexemeMap.CreateToken(str.trim(), TOKENTYPE, true, [0,0]);
			})
			;

		let pos = 0;
		tokens.forEach((token,i)=>{
			token.range = [];
			let text = LexemeMap.getTextForLexeme(token.lexeme);
			pos = string.indexOf(text, pos);
			token.range.push(pos);
			pos += text.length-1;
			token.range.push(pos);
			token.range.push(name);
		});

		let toReturn = new TokenList(TOKENTYPE,tokens);
		return toReturn;
	}
};


})();
