'use strict';


import {LexemeMap} from '../../token/LexemeMap.js';
import {TokenizerRegistry} from '../../token/TokenizerRegistry.js';
import {TokenList} from '../../token/TokenList.js';
import * as utils from '../../util/misc.js';

/*
global esprima
*/

(function(){

let TOKENTYPE = 'ecmascript';


/**
 * Split a file into tokens based on spaces.
 */
TokenizerRegistry.processors[TOKENTYPE] = {
	tokentype: TOKENTYPE,
	split: function(string, name='') {
		utils.checkNotNull(string);

		//https://esprima.readthedocs.io/en/latest/lexical-analysis.html
		let tokens = esprima
			.tokenize(string,{ range: true })
			.map((t)=>{
				t.range.push(name);
				let token = LexemeMap.CreateToken(t.value,TOKENTYPE,true,t.range);
				return token;
			})
			;

		let toReturn = new TokenList(TOKENTYPE,tokens);

		return toReturn;
	}
};


})();
