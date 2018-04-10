/*
 * CDDL HEADER START
 *
 * The contents of this file are subject to the terms of the
 * Common Development and Distribution License (the "License").
 * You may not use this file except in compliance with the License.
 *
 * See LICENSE.txt included in this distribution for the specific
 * language governing permissions and limitations under the License.
 *
 * CDDL HEADER END
 *
 * Copyright (c) 2014-2015 Nicholas DeMarinis, Matthew Heon, and Dolan Murvihill
 */
'use strict';
export {
	CharTokenizer
};

import {Token}     from '../Token.js';
import {TokenList} from '../TokenList.js';

import {checkNotNull} from '../../util/misc.js';

/**
 * Split a file into a list of character tokens.
 */
class CharTokenizer{ // extends Tokenizer {
    /**
     * @return Singleton instance of CharTokenizer
     */
    static getInstance() {
        if(!('instance' in CharTokenizer)) {
            CharTokenizer.instance = new CharTokenizer();
        }

        return CharTokenizer.instance;
    }

	/**
	 * Split a string into character tokens.
	 *
	 * @param string String to split
	 * @return Input string, with a single token representing each character
	 */
	splitString(string) {
		checkNotNull(string);

		let tokens = string.split('')
			.map((character) => {
				return new Token(character, TokenList.TokenTypes.CHARACTER);
			});

		let toReturn = new TokenList(this.getType(),tokens);
		return toReturn;
	}

	getType() {
		return TokenList.TokenTypes.CHARACTER;
	}

	toString() {
		return "Singleton instance of FileCharSplitter";
	}
}
