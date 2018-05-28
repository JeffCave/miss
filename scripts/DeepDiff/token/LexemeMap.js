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
'use strict';
export{
	LexemeMap
};


const LexemeMap = [];

/**
 *
 */
LexemeMap.getLexemeForToken = function(token) {
	if(token in LexemeMap) {
		let val = LexemeMap[token];
		return val;
	}

	let index = LexemeMap.length;
	LexemeMap[token] = index;
	LexemeMap.push(token);

	return index;
};


/**
 * Throws RuntimeException if lexeme does not map to any key.
 */
LexemeMap.getTokenForLexeme = function(lexeme) {
	if(lexeme < 0 || lexeme > (LexemeMap.length-1)) {
		throw new Error("Lexeme " + lexeme + " does not map to any value!");
	}
	return LexemeMap[lexeme];
};


LexemeMap.getLexemeForToken("");

