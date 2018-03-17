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

import {Submission} from '/submission/Submission.js';

import {ChecksimsException} from '/scripts/ChecksimsException.js';
import { checkNotNull, checkArgument } from '/scripts/util/misc.js';

/**
 * An entry in the Similarity Matrix.
 */
class MatrixEntry {
    /**
     * Construct a Similarity Matrix entry.
     *
     * @param base Submission we are reporting relative to
     * @param comparedTo Submission being compared to
     * @param similarTokens Number of tokens shared by both submissions
     */
    constructor(base, comparedTo, similarTokens) {
        checkNotNull(base);
        checkNotNull(comparedTo);
        checkArgument(similarTokens >= 0, "There cannot be a negative number of similar tokens");
        checkArgument(similarTokens <= base.getNumTokens(), "Attempted to created MatrixEntry with " + similarTokens
                + " similar tokens --- only " + base.getNumTokens() + " tokens in base!");

        this.base = base;
        this.comparedTo = comparedTo;
        this.similarTokens = +similarTokens;
        this.totalTokens = +base.getNumTokens();
        this.similarityPercent = 0.0;
        
        if(this.totalTokens > 0) {
            this.similarityPercent = similarTokens / this.totalTokens;
        }

    }

    /**
     * @return Base submission we are comparing
     */
    getBase() {
        return this.base;
    }

    /**
     * @return Submission the base is being compared to
     */
    getComparedTo() {
        return this.comparedTo;
    }

    /**
     * @return Percentage similarity of base submission to compared submission
     */
    getSimilarityPercent() {
        return this.similarityPercent;
    }

    /**
     * @return Number of identical tokens between the two submissions
     */
    getSimilarTokens() {
        return this.similarTokens;
    }

    /**
     * @return Total number of tokens in base submission
     */
    getTotalTokens() {
        return this.totalTokens;
    }

    toString() {
        return "Similarity Matrix Entry comparing " + base.getName() + " and " + comparedTo.getName();
    }

    equals(Object other) {
        if(!(other instanceof MatrixEntry)) {
            return false;
        }

        return other.getBase().equals(base) && other.getComparedTo().equals(comparedTo)
                && other.getSimilarTokens() === this.similarTokens;
    }

    hashCode() {
        return (this.base.hashCode() ^ this.comparedTo.hashCode()) * this.similarTokens;
    }
}
