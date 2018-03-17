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

import { Token } from '/scripts/token/Token.js';
import { ChecksimsException } from '/scripts/ChecksimsException.js';
import { checkNotNull,checkArgument } from '/scripts/util/misc.js';

/**
 * Superclass for decorators for Tokens.
 */
class AbstractTokenDecorator extends Token {

	constructor(wrappedToken) {
		checkNotNull(wrappedToken);
		this.wrappedToken = wrappedToken;
	}

	getType() {
		return this.wrappedToken.getType();
	}

	isValid() {
		return this.wrappedToken.isValid();
	}

	setValid(valid) {
		this.wrappedToken.setValid(valid);
	}

	getToken() {
		return this.wrappedToken.getToken();
	}

	getTokenAsString() {
		return this.wrappedToken.getTokenAsString();
	}

	getLexeme() {
		return this.wrappedToken.getLexeme();
	}

	equals(other) {
		return other instanceof Token && this.wrappedToken.equals(other);
	}

	toString() {
		return this.wrappedToken.toString();
	}

	hashCode() {
		return this.wrappedToken.hashCode();
	}
}
