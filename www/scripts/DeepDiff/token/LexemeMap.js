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
	let key = ['~',token].join('');
	if(key in LexemeMap) {
		let val = LexemeMap[key];
		return val;
	}

	let index = LexemeMap.length;
	LexemeMap[key] = index;
	LexemeMap.push(token);

	return index;
};


/**
 *
 */
LexemeMap.getTokenForLexeme = function(lexeme) {
	console.warn("DEPRECATED: use 'getTextForLexeme' instead of 'getTokenForLexeme'");
	return LexemeMap.getTextForLexeme(lexeme);
};
LexemeMap.getTextForLexeme = function(lexeme) {
	let token = LexemeMap[lexeme] || null;
	return token;
};


/**
 * A Token is the basic unit of comparison in DeepDiff. A token
 * represents a "chunk" of a submission --- typically a substring of
 * the submission, or a single character.
 *
 * Tokens are backed by "Lexemes" --- for details, see LexemeMap
 *
 * This interface enables easy use of Decorators for tokens.
 */
LexemeMap.CreateToken = function(token, type, valid=true, range=null) {
	if(!token){
		token = 0;
	}
	let rtn = {
		valid: valid,
		type: type,
	};
	if(Array.isArray(range)){
		rtn.range = range.splice(0,3);
	}
	if(typeof token === 'number'){
		rtn.lexeme = token;
	}
	else{
		rtn.lexeme = LexemeMap.getLexemeForToken(token);
	}
	return rtn;
};


LexemeMap.getLexemeForToken("");
