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
global AlgorithmResults
global SimilarityDetector
global Submission
global TokenList
global TokenType
global checkArgument
global checkNotNull
global hasher
*/
loader.load([
	,'https://cdnjs.cloudflare.com/ajax/libs/jsSHA/2.3.1/sha.js'

	,'/scripts/algorithm/AlgorithmResults.js'
	,'/scripts/algorithm/SimilarityDetector.js'
	,'/scripts/submission/Submission.js'
	,'/scripts/token/Token.js'
	,'/scripts/token/TokenList.js'
	,'/scripts/token/TokenType.js'
	,'/scripts/util/misc.js'

]);

/**
 * Internal class for record-keeping - used to record a line at a specific location in a submission.
 */
class SubmissionLine {
	constructor(lineNum, submission) {
		this.lineNum = lineNum;
		this.submission = submission;
	}
	toString() {
		return "Line " + this.lineNum + " from submission with name " + this.submission.getName();
	}
}


/**
 * Implements a line-by-line similarity checker.
 */
class LineSimilarityChecker extends SimilarityDetector {

	static getInstance() {
		if(!('instance' in LineSimilarityChecker)){
			LineSimilarityChecker.instance = new LineSimilarityChecker();
		}

		return LineSimilarityChecker.instance;
	}

	getName() {
		return "linecompare";
	}

	getDefaultTokenType() {
		return TokenType.LINE;
	}

	/**
	 * Detect similarities using line similarity comparator.
	 *
	 * @param a First submission to check
	 * @param b Second submission to check
	 * @return Results of the similarity detection
	 * @throws TokenTypeMismatchException Thrown comparing two submissions with different token types
	 * @throws InternalAlgorithmError Thrown on error obtaining a hash algorithm instance
	 */
	detectSimilarity(a, b){
		checkNotNull(a);
		checkNotNull(b);
		checkArgument(a instanceof Submission, "Expecting to compare Submissions (a is " + (typeof a) + ")");
		checkArgument(b instanceof Submission, "Expecting to compare Submissions (b is " + (typeof b) + ")");

		let linesA = a.getContentAsTokens();
		let linesB = b.getContentAsTokens();
		let finalA = TokenList.cloneTokenList(linesA);
		let finalB = TokenList.cloneTokenList(linesB);

		if(a.getTokenType() !== b.getTokenType()) {
			throw new Error("Token list type mismatch: submission " + a.getName() + " has type " +
				linesA.type.toString() + ", while submission " + b.getName() + " has type "
				+ linesB.type.toString());
		}
		else if(a.equals(b)) {
			finalA.forEach((token) => token.setValid(false));
			finalB.forEach((token) => token.setValid(false));
			return new AlgorithmResults(a, b, finalA, finalB);
		}


		// Create a line database map
		// Per-method basis to ensure we have no mutable state in the class
		let lineDatabase = {};

		// Hash all lines in A, and put them in the lines database
		this.addLinesToMap(linesA, lineDatabase, a, hasher);

		// Hash all lines in B, and put them in the lines database
		this.addLinesToMap(linesB, lineDatabase, b, hasher);

		// Number of matched lines contained in both
		let identicalLinesA = 0;
		let identicalLinesB = 0;

		// Check all the keys
		Object.keys(lineDatabase).forEach(function(key){

			// If more than 1 line has the hash...
			if(lineDatabase[key].length !== 1) {
				let numLinesA = 0;
				let numLinesB = 0;

				// Count the number of that line in each submission
				lineDatabase[key].forEach(function(s){
					if(s.submission.equals(a)) {
						numLinesA++;
					}
					else if(s.submission.equals(b)) {
						numLinesB++;
					}
					else {
						throw new Error("Unreachable code!");
					}
				});

				if(numLinesA == 0 || numLinesB == 0) {
					// Only one of the submissions includes the line - no plagiarism here
					return;
				}

				// Set matches invalid
				lineDatabase[key].forEach(function(s){
					if(s.submission.equals(a)) {
						finalA[s.lineNum].setValid(false);
					}
					else if(s.submission.equals(b)) {
						finalB[s.lineNum].setValid(false);
					}
					else {
						throw new Error("Unreachable code!");
					}
				});

				identicalLinesA += numLinesA;
				identicalLinesB += numLinesB;
			}
		});

		let invalTokensA = finalA.filter((token) => !token.isValid()).length;
		let invalTokensB = finalB.filter((token) => !token.isValid()).length;

		if(invalTokensA !== identicalLinesA) {
			throw new Error(
				"Internal error: number of identical tokens (" + identicalLinesA
				+ ") does not match number of invalid tokens (" + invalTokensA + ")"
			);
		}
		else if(invalTokensB !== identicalLinesB) {
			throw new Error(
				"Internal error: number of identical tokens (" + identicalLinesB
				+ ") does not match number of invalid tokens (" + invalTokensB + ")"
				);
		}

		let results =  new AlgorithmResults(a, b, finalA, finalB);
		return results;
	}

	addLinesToMap(lines, lineDatabase, submitter, hasher) {
		lines.forEach(function(token,i){
			let hash = hasher(token.getTokenAsString());
			if(!(hash in lineDatabase)) {
				lineDatabase[hash] = [];
			}

			let line = new SubmissionLine(i, submitter);
			lineDatabase[hash].push(line);
		});
	}

	toString() {
		return "Sole instance of the Line Similarity Counter algorithm";
	}

	hashCode() {
		return this.getName().hashCode();
	}

	equals(other) {
		return (other instanceof LineSimilarityChecker);
	}
}
