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
 * When distributing Covered Code, include this CDDL HEADER in each
 * file and include the License file at LICENSE.txt.
 * If applicable, add the following below this CDDL HEADER, with the
 * fields enclosed by brackets "[]" replaced with your own identifying
 * information: Portions Copyright [yyyy] [name of copyright owner]
 *
 * CDDL HEADER END
 *
 * Copyright (c) 2014-2015 Nicholas DeMarinis, Matthew Heon, and Dolan Murvihill
 */

'use strict';

/*
global loader
global TokenList
global ValidityIgnoringToken
global AbstractSubmissionDecorator
*/
loader.load([
	,'/scripts/token/TokenList.js'
	,'/scripts/token/ValidityIgnoringToken.js'
	,'/scripts/submission/AbstractSubmissionDecorator.js'
]);

/**
 * Submission which ignores validity - tokens are compared ignoring their validity.
 *
 * Decorates another submission and overrides equals()
 */
class ValidityIgnoringSubmission extends AbstractSubmissionDecorator {
    constructor(wrappedSubmission) {
        super(wrappedSubmission);
    }

    equals(other) {
        if(!(other instanceof 'Submission')) {
            return false;
        }
        if(!other.getTokenType().equals(this.getTokenType())
                || !other.getName().equals(this.getName())
                || !(other.getNumTokens() == this.getNumTokens())
                || !(other.getContentAsString().equals(this.getContentAsString()))) {
            return false;
        }

        let thisList = this.getContentAsTokens()
                .map(function(d){return new ValidityIgnoringToken(d);})
                ;
        let otherList = other.getContentAsTokens()
                .map(function(d){return new ValidityIgnoringToken(d);})
                ;

        return thisList.equals(otherList);
    }

    hashCode() {
        return super.hashCode();
    }
}
