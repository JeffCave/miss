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
	ValidityIgnoringToken
};

import Token from '../token/Token.js';


/**
 * Token which ignores validity when comparing.
 *
 * Decorates other tokens to override their equals() method
 */
export default class ValidityIgnoringToken extends Token {
	constructor(wrappedToken) {
		super(wrappedToken.Lexeme,wrappedToken.Type,wrappedToken.valid);
	}

	/**
	 * This method checks another token for equality, ignoring their validity.
	 *
	 * This means that, if two tokens with the same type and content but different validites are compare, this method
	 * WILL RETURN TRUE. This is a violation of the equals() contract. Hence, use ValidityIgnoringToken sparingly and
	 * with care.
	 *
	 * @param other Object to compare against
	 * @return True if Other is a token of identical type and content (IGNORES VALIDITY)
	 */
	equals(other) {
		if(!(other instanceof 'Token')) {
			return false;
		}
		return other.getType() === this.getType() && other.getLexeme() === this.getLexeme();
	}
}
