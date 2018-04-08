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
	Token
};

import {checkNotNull} from '../util/misc.js';
import {LexemeMap} from '../token/LexemeMap.js';

/**
 * Interface for Tokens.
 *
 * A Token is the basic unit of comparison in Checksims. A token represents a "chunk" of a submission --- typically a
 * substring of the submission, or a single character.
 *
 * Tokens are backed by "Lexemes" --- for details, see LexemeMap
 *
 * This interface enables easy use of Decorators for tokens.
 */
export default class Token {
	/**
	 * Construct a token with given type and validity.
	 *
	 * @param token Object the token represents
	 * @param type Type of token
	 * @param valid Whether the token is valid
	 */
	constructor(token, type, valid = true) {
		checkNotNull(token);
		checkNotNull(type);

		this.valid = valid;
		this.type = type;
		if(typeof token === 'number'){
			this.lexeme = token;
		}
		else{
			this.lexeme = LexemeMap.getLexemeForToken(token);
		}
	}

	/**
	 * @param token Token to clone
	 * @return Clone of token
	 */
	clone() {
		let clone = new Token(this.lexeme, this.type, this.valid);
		return clone;
	}

	getLexeme() {
		return this.Lexeme;
	}
	get Lexeme() {
		return this.lexeme;
	}

	getType() {
		return this.Type;
	}

	get Type() {
		return this.type;
	}

	getToken() {
		let token = LexemeMap.getTokenForLexeme(this.lexeme);
		return token;
	}

	getTokenAsString() {
		return this.getToken();
	}

	/**
	* @return Whether this token is valid
	*/
	isValid() {
		return this.valid;
	}

    /**
     * @param isValid New value for validity of this token
     */
    setValid(isValid) {
        this.valid = isValid;
    }

    /**
     * @param other Object to compare to
     * @return True if object compared to is a Token with same type and equiv. tokenization value
     */
    equals(other) {
        if(!(other instanceof 'Token')) {
            return false;
        }

        return other.getType().equals(this.type)
                && other.getLexeme() == this.lexeme
                && other.isValid() == this.valid
                ;
    }

    toString() {
        return "A " + this.type + " token containing \"" + this.getTokenAsString() + "\", represented by lexeme " + this.lexeme;
    }

    hashCode() {
        return this.lexeme;
    }

    /**
     * Perform a deep-copy of a token, returning a new, identical instance.
     *
     * TODO add copy constructor as well
     *
     * @param token Token to copy
     * @return New, identical copy of that token
     */
    static cloneToken(token) {
        checkNotNull(token);

        return new ConcreteToken(token.getLexeme(), token.getType(), token.isValid());
    }


}
