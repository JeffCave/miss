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
	Tokenizer
};

import {TokenList} from '../TokenList.js';
import {CharTokenizer}       from '/scripts/token/tokenizer/CharTokenizer.js';
import {WhitespaceTokenizer} from '/scripts/token/tokenizer/WhitespaceTokenizer.js';
import {LineTokenizer}       from '/scripts/token/tokenizer/LineTokenizer.js';

/**
 * Interface to convert a string into a list of tokens of a certain type.
 */
class Tokenizer {
	/**
	 * Tokenize a String.
	 *
	 * @param string String to tokenize
	 * @return A TokenList of type returned by getType(), containing tokens generated from the string
	 */
	splitString(string){
		throw new Error('Direct access of an interface');
	}

	/**
	 * @return Type of tokens produced by this tokenizer.
	 */
	getType(){
		throw new Error('Direct acess of interface');
	}

	/**
	 * Get a Tokenizer for given token type.
	 *
	 * @param type Type of token
	 * @return Tokenizer for given type of token
	 */
	static getTokenizer(type) {
		switch(type) {
			case TokenList.TokenType.CHARACTER:
				return CharTokenizer.getInstance();
			case TokenList.TokenType.LINE:
				return LineTokenizer.getInstance();
			case TokenList.TokenType.WHITESPACE:
				return WhitespaceTokenizer.getInstance();
			default:
				// TODO handle more gracefully
				throw new Error("Unhandled tokenization requested!");
		}
	}
}
