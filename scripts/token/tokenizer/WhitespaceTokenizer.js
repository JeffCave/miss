'use strict';
import {TokenizerRegistry} from '../../token/TokenizerRegistry.js';
import {TokenList} from '../../token/TokenList.js';
import {newToken} from '../../token/Token.js';
import {checkNotNull} from '../../util/misc.js';

/**
 * Split a file into tokens based on spaces.
 */
TokenizerRegistry.processors[TokenList.TokenTypes.WHITESPACE] = {
	seperator: ' ',
	split: function(string) {
		checkNotNull(string);

		let toReturn = string
			.split(/\s+/)
			.filter((str) => {
				return str !== "";
			})
			.map((str) => {
				return newToken(str, TokenList.TokenTypes.WHITESPACE);
			})
			;

		return toReturn;
	}
};
