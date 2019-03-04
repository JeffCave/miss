'use strict';
import {LexemeMap} from '../../token/LexemeMap.js';
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
	split: function(content, name='') {
		checkNotNull(content);
		let tokens = content
			.split("\n")
			.map((str)=>{
				return str.trim();
			})
			.filter(function(str){
				return str !== '';
			})
			.map((str) => {
				let token = LexemeMap.CreateToken(str, TOKENTYPE);
				return token;
			})
			;

		let pos = 0;
		tokens.forEach((token,i)=>{
			token.range = [];
			let text = LexemeMap.getTextForLexeme(token.lexeme);
			pos = content.indexOf(text, pos);
			token.range.push(pos);
			token.range.push(name);
			pos += text.length-1;
			token.range.push(pos);
		});

		return tokens;
	}
};


})();
