'use strict';

import {LexemeMap} from '../../token/LexemeMap.js';
import {TokenizerRegistry} from '../TokenizerRegistry.js';
import {TokenList} from '../TokenList.js';

import {checkNotNull} from '../../util/misc.js';


(function(){

let TOKENTYPE = 'character';

/**
 * Split a file into a list of character tokens.
 */
TokenizerRegistry.processors[TOKENTYPE] = {
	seperator: '',
	tokentype: TOKENTYPE,
	split: function(content, name='') {
		checkNotNull(content);

		let tokens = content.split('')
			.map((character,pos) => {
				return LexemeMap.CreateToken(character, TOKENTYPE,true,[pos,pos,name]);
			});

		let toReturn = new TokenList(TOKENTYPE,tokens);
		return toReturn;
	}
};

})();
