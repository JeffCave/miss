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
global TokenList
global TokenType
global checkNotNull
global Submission
*/
loader.load([
	,'/scripts/token/TokenList.js'
	,'/scripts/token/TokenType.js'
	,'/scripts/submission/Submission.js'
	,'/scripts/util/misc.js'
]);

/**
 * Superclass for submission decorators.
 */
class AbstractSubmissionDecorator extends Submission {
    constructor(wrappedSubmission) {
        checkNotNull(wrappedSubmission);
        this.wrappedSubmission = wrappedSubmission;
    }

	getContentAsTokens() {
		return this.wrappedSubmission.getContentAsTokens();
	}

	getContentAsString() {
		return this.wrappedSubmission.getContentAsString();
	}

    getName() {
        return this.wrappedSubmission.getName();
    }

	getNumTokens() {
        return this.wrappedSubmission.getNumTokens();
    }

    getTokenType() {
        return this.wrappedSubmission.getTokenType();
    }

    equals(other) {
        return other instanceof 'Submission' && this.wrappedSubmission.equals(other);
    }

    toString() {
        return this.wrappedSubmission.toString();
    }

    hashCode() {
        return this.wrappedSubmission.hashCode();
    }

    compareTo(other) {
        return this.wrappedSubmission.compareTo(other);
    }
}
