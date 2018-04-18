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
	newToken
};

import {LexemeMap} from '../token/LexemeMap.js';

/**
 * Interface for Tokens.
 *
 * A Token is the basic unit of comparison in Checksims. A token
 * represents a "chunk" of a submission --- typically a substring of
 * the submission, or a single character.
 *
 * Tokens are backed by "Lexemes" --- for details, see LexemeMap
 *
 * This interface enables easy use of Decorators for tokens.
 */
export default function newToken(token, type, valid=true) {
	let rtn = {};
	rtn.valid = valid;
	rtn.type = type;
	if(typeof token === 'number'){
		rtn.lexeme = token;
	}
	else{
		rtn.lexeme = LexemeMap.getLexemeForToken(token);
	}
	return rtn;
}
