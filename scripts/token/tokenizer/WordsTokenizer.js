'use strict';
import {TokenizerRegistry} from '../../token/TokenizerRegistry.js';
import {TokenList} from '../../token/TokenList.js';
import {newToken} from '../../token/Token.js';
import {checkNotNull} from '../../util/misc.js';

(function(){


let TOKENTYPE = 'words';

/**
 * Split a file into tokens based on words.
 *
 * Words are any collection of letters or numbers seperated by whitespace, or
 * punctuation. Words should also include hyphenated words (a hyphen with no space to either side)
 */
TokenizerRegistry.processors[TOKENTYPE] = {
	seperator: ' ',
	split: function(string) {
		checkNotNull(string);

		let toReturn = string
			.replace(/\s\-\s/,' ')
			.replace(/[^A-Za-z0-9\-]/g,' ')
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
