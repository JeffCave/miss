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
export{
	SimilarityMatrix
};

import {MatrixEntry} from '../../visualizations/similaritymatrix/MatrixEntry.js';
import {Submission} from '../../submission/Submission.js';
import {checkNotNull,checkArgument} from '../../util/misc.js';

/**
 * A Similarity Matrix represents the similarities between a given group of submissions.
 *
 * TODO consider offering Iterators for the entire similarity matrix, and for individual submissions on the X axis
 */
class SimilarityMatrix {
	/**
	 * Create a Similarity Matrix with given parameters. Internal constructor used by factory methods.
	 *
	 * Lists, not sets, of submissions, to ensure we have an ordering. We maintain the invariant that there are no
	 * duplicates in the factories.
	 *
	 * @param entries      The matrix itself
	 * @param xSubmissions Submissions on the X axis
	 * @param ySubmissions Submissions on the Y axis
	 * @param builtFrom    Set of Algorithm Results used to build the matrix
	 */
	constructor(entries, xSubmissions, ySubmissions, builtFrom) {
		checkNotNull(entries);
		checkNotNull(xSubmissions);
		checkNotNull(ySubmissions);
		checkNotNull(builtFrom);
		//checkArgument(xSubmissions.length !== 0, "Cannot make similarity matrix with empty list of submissions to be compared!");
		//checkArgument(ySubmissions.length !== 0, "Cannot make similarity matrix with empty list of submissions to compare to!");
		//checkArgument(xSubmissions.length === entries.length, "Array size mismatch when creating Similarity Matrix - X direction, found " + xSubmissions.length + ", expecting " + entries.length);
		//checkArgument(ySubmissions.length === entries[0].length, "Array size mismatch when creating Similarity Matrix - Y direction, found " + ySubmissions.length + ", expecting " + entries[0].length);
		//checkArgument(builtFrom.length !== 0, "Must provide Algorithm Results used to build similarity matrix - instead got empty set!");

		this.entries = entries;
		this.xSubmissions = xSubmissions;
		this.ySubmissions = ySubmissions;
		this.builtFrom = builtFrom;
	}

	/**
	* @return Size of the Similarity Matrix
	*/
	get ArrayBounds() {
		return [this.xSubmissions.length, this.ySubmissions.length];
	}

	/**
	 * @return Get the Algorithm Results that were used to build this similarity matrix
	 */
	get BaseResults() {
		return this.builtFrom;
	}

	/**
	 * Get similarities for one submission compared to another.
	 *
	 * @param xIndex Index into similarity matrix on the X axis
	 * @param yIndex Index into similarity matrix on the Y axis
	 * @return Matrix Entry for given X and Y index
	 */
	getEntryFor(xIndex, yIndex) {
		if(xIndex instanceof Submission){
			return this.getEntryForSubmissions(xIndex,yIndex);
		}

		checkArgument(xIndex >= 0, "X index must be greater than 0!");
		checkArgument(xIndex < this.xSubmissions.length, "X index must be less than X submissions size ("+ this.xSubmissions.length + ")!");
		checkArgument(yIndex >= 0, "Y index must be greater than 0!");
		checkArgument(yIndex < this.ySubmissions.length, "Y index must be less than Y submissions size ("+ this.ySubmissions.length + ")!");

		return this.entries[xIndex][yIndex];
	}

	/**
	 * Get similarity of X submission to Y submission.
	 *
	 * @param xSubmission Submission to get similarities for
	 * @param ySubmission Submission to get similarities relative to
	 * @return Similarities of xSubmission to ySubmission
	 * @throws NoSuchSubmissionException Thrown if either xSubmission or ySubmission are not present in the matrix
	 */
	getEntryForSubmissions(xSubmission, ySubmission) {
		checkNotNull(xSubmission);
		checkNotNull(ySubmission);

		let xIndex = this.xSubmissions.indexOf(xSubmission);
		if (xIndex < 0) {
			throw new Error("X Submission with name " + xSubmission.getName() + " not found in similarity matrix!");
		}

		let yIndex = this.ySubmissions.indexOf(ySubmission);
		if (yIndex < 0) {
			throw new Error("Y Submission with name " + ySubmission.getName() + " not found in similarity matrix!");
		}

		return this.entries[xIndex][yIndex];
	}

	toString() {
		return "A similarity matrix comparing " + this.xSubmissions.size() + " submissions to " + this.ySubmissions.size();
	}

	hashCode() {
		return this.builtFrom
			.map(function(algorithmResult){
				return Number.parseInt(algorithmResult.hashCode,10);
			})
			.reduce(function(a,d){
				return a+d;
			},0)
			;
	}

	equals(other) {
		if (!(other instanceof 'SimilarityMatrix')) {
			return false;
		}

		let areEqual =
			other.builtFrom.equals(this.builtFrom) &&
			other.xSubmissions.equals(this.xSubmissions) &&
			other.ySubmissions.equals(this.ySubmissions) &&
			JSON.stringify(other.entries) === JSON.stringify(this.entries)
			;
		return areEqual;
	}

	/**
	 * Generate a similarity matrix from a given set of submissions.
	 *
	 * @param inputSubmissions Submissions to generate from
	 * @param results Results to build from. Must contain results for every possible unordered pair of input submissions
	 * @return Similarity Matrix built from given results
	 * @throws InternalAlgorithmError Thrown on missing results, or results containing a submission not in the input
	 */
	static async generateMatrix(results, inputSubmissions, archive = []){
		checkNotNull(results);
		if(typeof inputSubmissions === 'object'){
			inputSubmissions = Object.values(inputSubmissions);
		}
		if('results' in results){
			inputSubmissions = results.submissions;
			archive = results.archives;
			results = results.results;
		}

		checkNotNull(inputSubmissions);
		//checkArgument(inputSubmissions.length !== 0, "Must provide at least 1 submission to build matrix from");
		//checkArgument(results.length !== 0, "Must provide at least 1 AlgorithmResults to build matrix from!");

		if(archive && archive.length > 0){
			return SimilarityMatrix.generateMatrixArchive(results, inputSubmissions, archive);
		}

		// Generate the matrix we'll use
		let matrix = [];
		for(let i=0; i<inputSubmissions.length; i++){
			matrix.push([]);
			for(let j=0; j<inputSubmissions.length; j++){
				matrix[i].push(0);
			}
		}

		// Order the submissions
		let orderedSubmissions = inputSubmissions.sort(function(a,b){
				let comp = a.name.localeCompare(b.name);
				return comp;
			});

		// Generate the matrix

		// Start with the diagonal, filling with 100% similarity
		orderedSubmissions.forEach((s,i)=>{
			matrix[i][i] = MatrixEntry(s, s);
		});

		// Now go through all the results, and build appropriate two MatrixEntry objects for each
		for(let r=0; r<results.length; r++){
			let result = results[r];
			let aIndex = orderedSubmissions.map(d=>{
					return d.name;
				})
				.indexOf(result.submissions[0].submission)
				;
			let bIndex = orderedSubmissions.map(d=>{
					return d.name;
				})
				.indexOf(result.submissions[1].submission)
				;

			if (aIndex === -1) {
				throw new Error("Processed Algorithm Result with submission not in given input submissions with name \"" + result.submissions[0].submission + "\"");
			}
			else if (bIndex === -1) {
				throw new Error("Processed Algorithm Result with submission not in given input submissions with name \"" + result.submissions[1].submission.name + "\"");
			}

			matrix[aIndex][bIndex] = MatrixEntry(result.submissions[0], result.submissions[1]);
			matrix[bIndex][aIndex] = MatrixEntry(result.submissions[1], result.submissions[0]);
		}

		let sim = new SimilarityMatrix(matrix, orderedSubmissions, orderedSubmissions, results);
		return sim;
	}

	/**
	 * Generate a Similarity Matrix with archive submissions.
	 *
	 * The result is not a square matrix. Only the input submissions are on the X axis, but the Y axis contains both
	 * input and archive submissions.
	 *
	 * @param inputSubmissions Submissions used to generate matrix
	 * @param archiveSubmissions Archive submissions - only compared to input submissions, not to each other
	 * @param results Results used to build matrix
	 * @return Similarity matrix built from given results
	 * @throws InternalAlgorithmError Thrown on missing results, or results containing a submission not in the input
	 */
	static generateMatrixArchive(inputSubmissions, results, archiveSubmissions){
		checkNotNull(inputSubmissions);
		checkNotNull(archiveSubmissions);
		checkNotNull(results);
		checkArgument(!inputSubmissions.isEmpty(), "Must provide at least 1 submission to build matrix from");
		checkArgument(!results.isEmpty(), "Must provide at least 1 AlgorithmResults to build matrix from!");

		let setOfBoth = new Set();
		setOfBoth.addAll(inputSubmissions);
		setOfBoth.addAll(archiveSubmissions);

		checkArgument(setOfBoth.size === (archiveSubmissions.size() + inputSubmissions.size()), "Some submissions were found in both archive and input submissions!");

		// If there are no archive submissions, just generate using the other function
		if(archiveSubmissions.isEmpty()) {
			return SimilarityMatrix.generateMatrix(inputSubmissions, results, null);
		}

		let xSubmissions = inputSubmissions.sort();
		let ySubmissions = [];
		ySubmissions = ySubmissions.concat(inputSubmissions.sort());
		ySubmissions = ySubmissions.concat(archiveSubmissions.sort());

		let matrix = new MatrixEntry[xSubmissions.size][ySubmissions.size];

		// Generate the matrix

		// First, handle identical submissions
		xSubmissions.forEach(function(xSub){
			// Get the X index
			let xIndex = xSubmissions.indexOf(xSub);
			let yIndex = ySubmissions.indexOf(xSub);

			matrix[xIndex][yIndex] = new MatrixEntry(xSub, xSub, xSub.NumTokens);
		});

        // Now iterate through all given algorithm results
        results.forEach(function(result){
            let aXCoord = xSubmissions.indexOf(result.a);
            let bXCoord = xSubmissions.indexOf(result.b);

            if(aXCoord === -1 && bXCoord === -1) {
                throw new Error("Neither submission \"" + result.a.getName() + "\" nor \"" + result.b.getName() + "\" were found in input submissions!");
            }

            if(aXCoord !== -1) {
                let bYCoord = ySubmissions.indexOf(result.b);

                matrix[aXCoord][bYCoord] = new MatrixEntry(result.a, result.b, result.identicalTokensA);
            }

            if(bXCoord != -1) {
                let aYCoord = ySubmissions.indexOf(result.a);

                matrix[bXCoord][aYCoord] = new MatrixEntry(result.b, result.a, result.identicalTokensB);
            }
        });

        // Verification pass - ensure we built a matrix with no nulls
        for(let x = 0; x < xSubmissions.size(); x++) {
            for(let y = 0; y < ySubmissions.size(); y++) {
                if(matrix[x][y] == null) {
                    throw new Error("Missing Algorithm Results for comparison of submissions \""
                            + xSubmissions.get(x).getName() + "\" and \"" + ySubmissions.get(y).getName()
                            + "\"");
                }
            }
        }

        return new SimilarityMatrix(matrix, xSubmissions, ySubmissions, results);
    }
}
