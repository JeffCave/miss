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
/*
global loader
global checkNotNull
*/
loader.load([
	,'/scripts/util/misc.js'
]);


/**
 * Maps lexemes (integers) to the original token contents.
 *
 * A Token is actually an integer index into this Lexeme Map. When
 * first created, the contents of a token (also referred to as its
 * "backing object") are passed into this map and mapped to a unique
 * integer. This integer now represents the "backing object" for the
 * newly-created token, and any other tokens created which share the
 * same backing object. This allows token comparison to be a simple
 * integer comparison, much faster than a string comparison might be
 * for tokens backed by large strings.
 *
 * This does result in wasted space if tokens are backed by
 * characters. Java uses UTF-16 internally, and LexemeMap maps to
 * 32-bit integers, so representing characters in the LexemeMap
 * doubles their size at present. This is considered unavoidable at
 * present, though in the future it is desired to add Tokens backed
 * by Characters, not integers.
 */
class LexemeMap {
	constructor() {

	}

	static get lexemeMap(){
		if(!('pLexemeMap' in LexemeMap)){
			this.pLexemeMap = new Map();
		}
		return this.pLexemeMap;
	}

	static get lexemeIndex(){
		if(!('pLexemeIndex' in LexemeMap)){
			this.pLexemeIndex = 0;
		}
		return this.pLexemeIndex;
	}

	static set lexemeIndex(value){
		this.pLexemeIndex = value;
	}

	/**
	 * @param token Token to get lexeme for
	 * @return Lexeme representing this token. If no such lexeme existed prior, it is created and mapped to the token.
	 */
	static getLexemeForToken(token) {
		checkNotNull(token);

		if(this.lexemeMap.has(token)) {
			let val = this.lexemeMap.get(token);
			return val;
		}
		let newLexeme = this.lexemeIndex;
		this.lexemeIndex = this.lexemeIndex + 1;
		this.lexemeMap.set(token, newLexeme);

		return newLexeme;
	}

	/**
	 * Throws RuntimeException if lexeme does not map to any key.
	 *
	 * TODO Investigate conversion to checked exception?
	 *
	 * @param lexeme Lexeme being requested
	 * @return Token of given type
	 */
	static getTokenForLexeme(lexeme) {
		if(!this.lexemeMap.inverse().containsKey(lexeme)) {
			throw new Error("Lexeme " + lexeme + " does not map to any value!");
		}

		return this.lexemeMap.inverse().get(lexeme);
	}

	/**
	 * Used to reset state for unit tests.
	 *
	 * CAUTION! This will obliterate the existing token mappings! DO NOT CALL IN PRODUCTION CODE!
	 */
	static resetMappings() {
		this.lexemeMap.clear();
		this.lexemeIndex = 0;
	}
}
