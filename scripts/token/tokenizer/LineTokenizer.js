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
	LineTokenizer
};

import {Token} from '../../token/Token.js';
import {Tokenizer} from '../../token/tokenizer/Tokenizer.js';
import {TokenList} from '../../token/TokenList.js';
import {checkNotNull} from '../../util/misc.js';

/**
 * Splits a file on a line-by-line basis.
 */
class LineTokenizer extends Tokenizer {
	constructor(){
		super();
		if('instance' in LineTokenizer) {
			throw new Error("Attempt to construct LineTokenizer, use 'getInstance'");
		}
	}

	/**
	 * @return Singleton instance of LineTokenizer
	 */
	static getInstance() {
		if(!('instance' in LineTokenizer)) {
			LineTokenizer.instance = new LineTokenizer();
		}
		return LineTokenizer.instance;
	}

	/**
	 * Split string into newline-delineated tokens.
	 *
	 * @param string String to split
	 * @return List of LINE tokens representing the input string
	 */
	splitString(content) {
		checkNotNull(content);
		let tokens = content
			.split("\n")
			.filter(function(str){
				return str !== '';
			})
			.map((str) => {
				return new Token(str, TokenList.TokenType.LINE);
			})
			;
		let toReturn = new TokenList(this.getType(),tokens);
		return toReturn;
	}

	getType() {
		return TokenList.TokenType.LINE;
	}

	toString() {
		return "Singleton FileLineSplitter instance";
	}
}
