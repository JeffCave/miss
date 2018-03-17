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

import {AbstractTokenDecorator} from '/scripts/token/AbstractTokenDecorator.js';


/**
 * Token which will only be equal to other tokens which are valid.
 *
 * Decorates other tokens to override their equals() methods
 */
export class ValidityEnsuringToken extends AbstractTokenDecorator {
	constructor(wrappedToken) {
		super(wrappedToken);
	}

	/**
	 * This method checks another token for equality, ensuring the validity of both tokens.
	 *
	 * This means that, if two identical but invalid tokens are compared, this method WILL RETURN FALSE. This is a
	 * violation of the equals() contract. Hence, use ValidityEnsuringToken sparingly and with care.
	 *
	 * @param other Object to compare against
	 * @return True if Other is a token of identical type and content, and both this token and the other token are valid
	 */
	equals(other) {
		// Ensure that comparison against invalid tokens is Very Fast by making this the first condition
		if(!this.isValid()) {
			return false;
		}

		if(!(other instanceof 'Token')) {
			return false;
		}

		return other.getType().equals(this.getType())
			&& other.getLexeme() == this.getLexeme()
			&& other.isValid()
			;
	}

	hashCode() {
		return super.hashCode();
	}
}
