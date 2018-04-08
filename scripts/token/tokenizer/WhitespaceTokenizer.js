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
	WhitespaceTokenizer
};

import {Token} from '../../token/Token.js';
import {checkNotNull} from '../../util/misc.js';

/**
 * Split a file into tokens based on spaces.
 */
class WhitespaceTokenizer{ // extends Tokenizer {
	/**
	 * @return Singleton instance of WhitespaceTokenizer
	 */
	static getInstance() {
		if(!('instance' in WhitespaceTokenizer)){
			WhitespaceTokenizer.instance = new WhitespaceTokenizer();
		}

		return WhitespaceTokenizer.instance;
	}

	/**
	 * Split a string into whitespace-delineated tokens.
	 *
	 * @param string Input string
	 * @return List of WHITESPACE tokens representing the input submission
	 */
	splitString(string) {
		checkNotNull(string);

		let toReturn = string
			.split("\\s+")
			.filter((str) => {return str === "";})
			.map((str) => {
				return new Token(str, TokenType.WHITESPACE);
			})
			;

		return toReturn;
	}

    getType() {
        return TokenType.WHITESPACE;
    }

    toString() {
        return "Singleton instance of FileSpaceSplitter";
    }
}
