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
	ValidityIgnoringSubmission
};

import {Submission} from '/scripts/submission/Submission.js';
import {ValidityIgnoringToken} from '/scripts/token/ValidityIgnoringToken.js';


/**
 * Submission which ignores validity - tokens are compared ignoring
 * their validity.
 *
 * Decorates another submission and overrides equals()
 */
export default class ValidityIgnoringSubmission extends Submission {
	constructor(wrappedSubmission) {
		super(wrappedSubmission);
	}

	equals(other) {
		if(!(other instanceof Submission)) {
			return false;
		}
		let areNotEqual = false
			//|| other.getTokenType() !== this.getTokenType()
			|| other.getName() !== this.getName()
			|| other.getNumTokens() !== this.getNumTokens()
			|| other.getContentAsString() !== this.getContentAsString()
			;
		if(areNotEqual){
			return false;
		}

		let thisList = this.getContentAsTokens()
			.map(function(d){
				let token = new ValidityIgnoringToken(d);
				return token;
			})
			;
		let otherList = other.getContentAsTokens()
			.map(function(d){
				let token = new ValidityIgnoringToken(d);
				return token;
			})
			;

		return thisList.equals(otherList);
	}

	hashCode() {
		return super.hashCode();
	}
}
