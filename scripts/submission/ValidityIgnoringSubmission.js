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

import {Submission} from '../submission/Submission.js';
import {TokenList} from '../token/TokenList.js';
import {ValidityIgnoringToken} from '../token/ValidityIgnoringToken.js';

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

	async equals(that) {
		if(!(that instanceof Submission)) {
			return false;
		}

		if(that.Name !== this.Name){
			return false;
		}

		let aContent = await this.ContentAsString;
		let bContent = await that.ContentAsString;
		if(aContent !== bContent){
			return false;
		}

		let aTokens = await this.ContentAsTokens;
		let bTokens = await that.ContentAsTokens;
		if(!aTokens.equals(bTokens)){
			return false;
		}

		let thisList = Array.from(await this.ContentAsTokens)
			.map(function(d){
				let token = new ValidityIgnoringToken(d);
				return token;
			})
			;
		let thatList = Array.from(await that.ContentAsTokens)
			.map(function(d){
				let token = new ValidityIgnoringToken(d);
				return token;
			})
			;
		thisList = new TokenList(aTokens.type,thisList);
		thatList = new TokenList(bTokens.type,thatList);
		let isEqual = thisList.equals(thatList);
		return isEqual;
	}

	hashCode() {
		return super.hashCode();
	}
}
