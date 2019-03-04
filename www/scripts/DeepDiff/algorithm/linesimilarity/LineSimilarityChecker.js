'use strict';

import {AlgorithmRegistry} from '../../algorithm/AlgorithmRegistry.js';
import * as AlgorithmResults from '../../algorithm/AlgorithmResults.js';
import {Submission} from '../../submission/Submission.js';
import {TokenList} from '../../token/TokenList.js';
import {LexemeMap} from '../../token/LexemeMap.js';
import {checkNotNull, checkArgument, hasher} from '../../util/misc.js';

(function(){


function addLinesToMap(lines, lineDatabase, submitter, hasher) {
	lines.forEach(function(token,i){
		let hash = hasher(LexemeMap[token.lexeme]);
		if(!(hash in lineDatabase)) {
			lineDatabase[hash] = [];
		}

		let line = {lineNum:i, submission:submitter};
		lineDatabase[hash].push(line);
	});
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
AlgorithmRegistry.processors["linecompare"] = async function(currentResults){
	checkNotNull(currentResults);

	let a = currentResults.submissions[0];
	let b = currentResults.submissions[1];

	let linesA = await a.ContentAsTokens;
	let linesB = await b.ContentAsTokens;
	let finalA = await TokenList.cloneTokenList(linesA);
	let finalB = await TokenList.cloneTokenList(linesB);

	let isEqual = await a.equals(b);
	if(isEqual) {
		finalA.forEach((token) => token.setValid(false));
		finalB.forEach((token) => token.setValid(false));
		return AlgorithmResults(a, b, finalA, finalB);
	}


	// Create a line database map
	// Per-method basis to ensure we have no mutable state in the class
	let lineDatabase = {};

	// Hash all lines in A, and put them in the lines database
	addLinesToMap(linesA, lineDatabase, a, hasher);

	// Hash all lines in B, and put them in the lines database
	addLinesToMap(linesB, lineDatabase, b, hasher);

	// Number of matched lines contained in both
	let identicalLinesA = 0;
	let identicalLinesB = 0;

	// Check all the keys
	Object.values(lineDatabase).forEach(function(val){
		// If more than 1 line has the hash...
		if(val.length !== 1) {
			let numLinesA = 0;
			let numLinesB = 0;

			// Count the number of that line in each submission
			val.forEach(function(s){
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
			val.forEach(function(s){
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

	let invalTokensA = Array.from(finalA).filter((token) => !token.valid).length;
	let invalTokensB = Array.from(finalB).filter((token) => !token.valid).length;

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

	let results = AlgorithmResults(a, b, finalA, finalB);
	return results;
};

})();
