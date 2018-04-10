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
	MatrixEntry
};

import {checkNotNull,checkArgument} from '../../util/misc.js';

/**
 * An entry in the Similarity Matrix.
 */
export default class MatrixEntry {
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
		checkArgument(similarTokens <= base.NumTokens, "Attempted to created MatrixEntry with " + similarTokens
				+ " similar tokens --- only " + base.NumTokens + " tokens in base!");

		this.base = base;
		this.comparedTo = comparedTo;
		this.similarTokens = +similarTokens;
		this.totalTokens = +base.NumTokens;
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
		return "Similarity Matrix Entry comparing " + this.base.getName() + " and " + this.comparedTo.getName();
	}

	equals(other) {
		if(!(other instanceof MatrixEntry)) {
			return false;
		}

		return	other.getBase().equals(this.base) &&
				other.getComparedTo().equals(this.comparedTo) &&
				other.getSimilarTokens() === this.similarTokens
				;
	}

	hashCode() {
		return (this.base.hashCode() ^ this.comparedTo.hashCode()) * this.similarTokens;
	}
}
