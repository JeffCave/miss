'use strict';

import {LexemeMap} from '../../token/LexemeMap.js';
import {TokenizerRegistry} from '../../token/TokenizerRegistry.js';
import {TokenList} from '../../token/TokenList.js';
import * as utils from '../../util/misc.js';

/*
global filbert
*/

(function(){

let TOKENTYPE = 'python';


/**
 * Split a file into tokens based on spaces.
 */
TokenizerRegistry.processors[TOKENTYPE] = {
	tokentype: TOKENTYPE,
	split: function(string, name=''){
		utils.checkNotNull(string);

		// https://github.com/differentmatt/filbert
		let tokens = [];
		let getToken = filbert.tokenize(string,{ range: true });
		for(let token = getToken(); token.type.type !== 'eof'; token = getToken()){
			if(!token.value){
				continue;
			}

			//console.debug(token.value);
			token.value = token.value.toString().trim();
			if(token.value === ''){
				continue;
			}
			token = LexemeMap.CreateToken(token.value, TOKENTYPE, true, [token.start,token.end,name]);

			if(token.lexeme !== 0){
				tokens.push(token);
			}
		}

		let toReturn = new TokenList(TOKENTYPE,tokens);

		return toReturn;
	}
};


})();
