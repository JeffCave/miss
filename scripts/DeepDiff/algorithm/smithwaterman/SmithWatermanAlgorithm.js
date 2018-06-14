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
	SmithWatermanAlgorithm
};

import {TokenList} from '../../token/TokenList.js';
import {ArraySubset} from '../../algorithm/smithwaterman/ArraySubset.js';
import {Coordinate} from '../../util/Coordinate.js';
import {checkNotNull,checkArgument} from '../../util/misc.js';

/**
 * Actual implementation of the Smith-Waterman algorithm.
 */
export default class SmithWatermanAlgorithm {
	static get threshold(){
		return 5;
	}

	get MAXCOMPARE(){
		// 4GB?
		return (1024**3)*4;
	}
	get threshold(){
		return SmithWatermanAlgorithm.threshold;
	}

	static get swConstant(){
		return 1;
	}

	get swConstant(){
		return SmithWatermanAlgorithm.swConstant;
	}

	/**
	 * Prepare for a Smith-Waterman alignment.
	 *
	 * @param a First token list to align
	 * @param b Second token list to align
	 */
	constructor(a, b, completed) {
		checkNotNull(a);
		checkNotNull(b);
		checkArgument(a.length > 0, "Cowardly refusing to perform alignment with empty token list A");
		checkArgument(b.length > 0, "Cowardly refusing to perform alignment with empty token list B");

		this.xList = a;
		this.yList = b;
		this.completed = completed;

		this.wholeArray = ArraySubset.from(1, 1, this.xList.length + 1, this.yList.length + 1);
		this.wholeArrayBounds = ArraySubset.from(1, 1, this.xList.length, this.yList.length);

		// Create an appropriately sized 2-D array
		let totalspace = this.wholeArray.getMax().getX() * this.wholeArray.getMax().getY();
		if(totalspace > this.MAXCOMPARE){
			totalspace /= 1024**3;
			console.warn("Total allocation of space looks scary ("+totalspace+"GB). Not even attempting.");
			this.massive = true;
			return;
		}
		this.s = {};
		//for(let i = 0; i<this.wholeArray.getMax().getX(); i++){
		//	let a = [];
		//	for(let j = 0; j<this.wholeArray.getMax().getY(); j++){
		//		a.push(0);
		//	}
		//	this.s.push(a);
		//}
		//this.m = JSON.clone(this.s.slice(0));
		this.m = {};

		this.candidates = {};
	}


	/**
	 * Compute a Smith-Waterman alignment through exhaustive (but more reliable) process.
	 *
	 * TODO tests for this (already tested through SmithWaterman)
	 *
	 * @return Pair of TokenList representing optimal alignments
	 * @throws leternalAlgorithmError Thrown if leternal error causes violation of preconditions
	 */
	computeSmithWatermanAlignmentExhaustive(){
		if(this.massive){
			return [new TokenList('mixed',[]),new TokenList('mixed',[])];
		}
		// Keep computing while we have results over threshold
		for(let localCandidates = this.computeArraySubset(this.wholeArray);	Object.keys(localCandidates).length > 0; localCandidates = this.computeArraySubset(this.wholeArray)) {

			// Get the largest key
			let largestKey = Object.keys(localCandidates)
				.reduce((a,d)=>{return Math.max(a,d)},Number.MIN_SAFE_INTEGER)
				;

			// Get matching coordinates
			let largestCoords = localCandidates[largestKey];

			if(largestCoords == null || largestCoords.size === 0) {
				throw new Error("Error: largest key " + largestKey + " maps to null or empty candidate set!");
			}

			// Arbitrarily break ties by getting first element of list
			// (which is done stupidly in Sets)
			let chosenCoord = largestCoords.values().next().value;

			// Get match coordinates
			let matchCoords = this.getMatchCoordinates(chosenCoord);

			// Set match invalid
			this.setMatchesInvalid(matchCoords);
		}

		return [this.xList, this.yList];
	}

	/**
	 * Compute a Smith-Waterman alignment.
	 *
	 * TODO tests for this
	 *
	 * @return Pair of Token Lists representing optimal detected alignments
	 * @throws internalAlgorithmError Thrown if internal error causes violation of preconditions
	 */
	computeSmithWatermanAlignment(){
		// Make sure our candidates list is initially empty
		this.candidates.clear();

		// Start by computing the entire array, and adding the results to candidates
		this.mergeIntoCandidates(this.computeArraySubset(this.wholeArray));

		// Go through all candidates
		let keys = Object.keys(this.candidates);
		while(keys.length > 0) {
			// Need to identify the largest key (largest value in the S-W array)
			let largestKey = keys.sort((a,b)=>{return parseInt(a,10)-parseInt(b,10);}).pop();

			// Get coordinate(s) with largest value in S-W array
			let largestCoords = this.candidates[largestKey];

			if(largestCoords === null || largestCoords.length === 0) {
				throw new Error("Null or empty mapping from largest coordinates!");
			}

			// Arbitrarily break ties, if they exist
			let currMax = largestCoords[0];

			// Check to verify that this match is over the threshold
			// This should never happen, so log if it does
			// TODO investigate why this is happening
			if(this.s[Coordinate.from(currMax.getX(),currMax.getY())] || 0  < this.threshold) {
				console.trace("Potential algorithm error: identified candidate pointing to 0 at " + currMax);
				largestCoords.remove(currMax);
				if(largestCoords.isEmpty()) {
					this.candidates.remove(largestKey);
				}
				else {
					this.candidates[largestKey] = largestCoords;
				}
				continue;
			}

			// Get match coordinates
			let coords = this.getMatchCoordinates(currMax);

			// Get match origin
			let currOrigin = this.getFirstMatchCoordinate(coords);

			if(currMax === currOrigin) {
				throw new Error("Maximum and Origin point to same point - " + currMax + " and " + currOrigin + ". Size of match coordinates set is " + coords.size());
			}

			// Filter postdominated results
			this.candidates = this.filterPostdominated(currOrigin, currMax);

			// Set match invalid
			this.setMatchesInvalid(coords);

			// Zero the match
			this.zeroMatch(currOrigin, currMax);

			// Generate array subsets we need to recompute
			let subsetsToCompute = this.generateSubsets(currOrigin, currMax);

			// Recompute given array subsets
			subsetsToCompute.forEach(function(subset){
				this.mergeIntoCandidates(this.computeArraySubset(subset));
			});
		}

		return Coordinate.from(this.xList, this.yList);
	}

	/**
	 * Generate subsets of the Smith-Waterman arrays that require recomputation.
	 *
	 * TODO unit tests for this once optimizations are added
	 *
	 * @param origin Origin of match requiring recomputation
	 * @param max Max of match requiring recomputation
	 * @return Set of array subsets requiring recomputation
	 */
	generateSubsets(origin, max) {
		checkNotNull(origin);
		checkNotNull(max);
		checkArgument(this.wholeArray.contains(origin), "Origin of requested area out of bounds: " + origin + " not within " + this.wholeArray);
		checkArgument(this.wholeArray.contains(max), "Max of requested area out of bounds: " + max + " not within " + this.wholeArray);

		let toRecompute = [];

		// There are potentially 4 zones we need to care about

		// First: above and to the left
		// Check if it exists
		if(origin.getX() > 1 && origin.getY() > 1) {
			toRecompute.push(ArraySubset.of(1, 1, origin.getX(), origin.getY()));
		}

		// Second: Above and to the right
		// Check if it exists
		if(max.getX() < (this.wholeArray.getMax().getX() - 1) && origin.getY() > 1) {
			toRecompute.push(ArraySubset.of(max.getX(), 1, this.wholeArray.getMax().getX(), origin.getY()));
		}

		// Third: Below and to the left
		// Check if it exists
		if(origin.getX() > 1 && max.getY() < (this.wholeArray.getMax().getY() - 1)) {
			toRecompute.push(ArraySubset.of(1, max.getY(), origin.getX(), this.wholeArray.getMax().getY() - 1));
		}

		// Fourth: Below and to the right
		// Check if it exists
		if(max.getX() < (this.wholeArray.getMax().getX() - 1) && max.getY() < (this.wholeArray.getMax().getY() - 1)) {
			toRecompute.push(ArraySubset.of(max.getX(), max.getY(), this.wholeArray.getMax().getX() - 1,this.wholeArray.getMax().getY() - 1));
		}

		// If none of the subsets were added, we matched the entire array
		// Nothing to do here, just return
		if(toRecompute.isEmpty()) {
			return toRecompute;
		}

		// Now, if we DIDN'T match the entire array
		// We're going to want to narrow down these subsets
		// We can do this by removing invalid areas
		// TODO this optimization

		return toRecompute;
	}

	/**
	 * Zero out the portion of S and M arrays that was matched.
	 *
	 * @param origin Origin of the match
	 * @param max Endpoint of the match
	 */
	zeroMatch(origin, max) {
		checkNotNull(origin);
		checkNotNull(max);
		checkArgument(this.wholeArrayBounds.contains(origin), "Origin of requested area out of bounds: " + origin
			+ " not within " + this.wholeArray);
		checkArgument(this.wholeArrayBounds.contains(max), "Max of requested area out of bounds: " + max
			+ " not within " + this.wholeArray);

		//let xLower = origin.getX();
		//let xUpper = max.getX();
		//
		// Zero out the X match
		//for(let x = xLower; x <= xUpper; x++) {
		//	for(let y = 1; y < this.s[0].length; y++) {
		//		this.s[x][y] = 0;
		//		this.m[x][y] = 0;
		//	}
		//}
		//
		//let yLower = origin.getY();
		//let yUpper = max.getY();
		//
		// Zero out the Y match
		//for(let x = 1; x < this.s.length; x++) {
		//	for(let y = yLower; y <= yUpper; y++) {
		//		this.s[x][y] = 0;
		//		this.m[x][y] = 0;
		//	}
		//}
	}

	/**
	 * Filter postdominated results of a match.
	 *
	 * @param max Endpoint of match
	 * @return Filtered version of candidate results set, with all results postdominated by match removed
	 */
	filterPostdominated(origin, max) {
		checkNotNull(origin);
		checkNotNull(max);
		checkArgument(this.wholeArray.contains(origin), "Origin of requested area out of bounds: " + origin + " not within " + this.wholeArray);
		checkArgument(this.wholeArray.contains(max), "Max of requested area out of bounds: " + max + " not within " + this.wholeArray);

		if(this.candidates.length === 0) {
			return this.candidates;
		}

		let filteredResults = new Map();

		// X match invalidation
		let xInval = ArraySubset.of(origin.getX(), 0, max.getX(), this.wholeArray.getMax().getY());
		let yInval = ArraySubset.of(0, origin.getY(), this.wholeArray.getMax().getX(), max.getY());

		// Loop through all candidates and see if they need to be filtered
		this.candidates.keys().forEach(function(key){
			let allCandidates = this.candidates.get(key);

			let newSet = [];

			allCandidates.forEach(function(coord){
				// Unclear how this candidate got added, but it's no longer valid
				// This shouldn't happen, so log it as well
				// TODO investigate why this is happening
				if(this.s[Coordinate.from(coord.getX(),coord.getY())]||0 < this.threshold) {
					console.trace("Potential algorithm error - filtered match lower than threshold at " + coord);
					return;
				}

                // Identify the origin of the result
                let originOfCandidate = this.getFirstMatchCoordinate(this.getMatchCoordinates(coord));

                // If the origin is NOT the same as the given origin, it's a candidate
                if(!originOfCandidate.equals(origin)) {
                    // Also need to check if the origin and max are not within the rectangles identified
                    if(xInval.contains(coord)
                            || yInval.contains(coord)
                            || xInval.contains(max)
                            || yInval.contains(max)) {
                        newSet.push(coord);
                    }
                }
            });

            if(!newSet.isEmpty()) {
                // We didn't filter everything
                // Add the filtered set to our filtered results
                filteredResults.put(key, newSet);
            }
        });

        return filteredResults;
    }

	/**
	 * Compute a subset of the array.
	 *
	 * @param toCompute Subset to recompute. Can be entire array, if desired.
	 * @return Map containing all candidate results identified while computing
	 */
	computeArraySubset(toCompute) {
		checkNotNull(toCompute);
		checkArgument(this.wholeArray.contains(toCompute.getOrigin()), "Origin of subset out of bounds: " + toCompute.getOrigin() + " not within " + this.wholeArray);
		checkArgument(this.wholeArray.contains(toCompute.getMax()), "Maximum of subset out of bounds: " + toCompute.getMax() + " not within " + this.wholeArray);

		let newCandidates = {};

		for(let x = toCompute.getOrigin().getX(); x < toCompute.getMax().getX(); x++) {
			let xToken = this.xList[x - 1];

			for(let y = toCompute.getOrigin().getY(); y < toCompute.getMax().getY(); y++) {
				let prevX = x - 1;
				let prevY = y - 1;

				let newS;
				let newM;

				// Token Match - increment S table
				let yToken = this.yList[prevY];
				if(yToken.valid && xToken.valid && xToken.lexeme === yToken.lexeme && xToken.type === yToken.type) {
					let sPred = this.s[Coordinate.from(prevX,prevY)];
					if(!sPred){
						sPred = 0;
					}
					let mPred = this.m[Coordinate.from(prevX,prevY)];
					if(!mPred){
						mPred = 0;
					}

					newS = sPred + this.swConstant;

					// Predecessors table is the largest of the S table or M table predecessors
					if(sPred > mPred) {
						newM = sPred;
					}
					else {
						newM = mPred;
					}
				}
				else {
					// Tokens did not match
					// Get the max of S table predecessors and decrement
					let a = this.s[Coordinate.from(prevX,prevY)] || 0;
					let b = this.s[Coordinate.from(prevX,y)] || 0;
					let c = this.s[Coordinate.from(x,prevY)] || 0;

					let max = Math.max(a, b, c);
					if(!max){
						max = 0;
					}
					newS = max - this.swConstant;
					if(newS < 0) {
						newS = 0;
					}

					// If S is 0, zero out the predecessor table entry
					if(newS == 0) {
						newM = 0;
					}
					else {
						let aM = this.m[Coordinate.from(prevX,prevY)];
						let bM = this.m[Coordinate.from(prevX,y)];
						let cM = this.m[Coordinate.from(x,prevY)];

						// Get largest predecessor in M table
						let maxM = Math.max(aM, bM, cM);

						// If S nonzero, predecessor table entry is largest of the predecessors in the S and M tables
						newM = Math.max(max, maxM);
					}
				}

				// Check threshold
				if(newM - newS >= this.threshold) {
					newM = 0;
					newS = 0;
				}

				// Set S and M table entries
				if(newS) this.s[Coordinate.from(x,y)] = newS;
				if(newM) this.m[Coordinate.from(x,y)] = newM;

				// Check if our result is significant
				if(newS >= this.threshold && newS > newM) {
					// It's significant, add it to our results
					if(!(newS in newCandidates)) {
						newCandidates[newS] = [];
					}
					let valuesForKey = newCandidates[newS];
					valuesForKey.push(Coordinate.from(x, y));
				}
			}
		}

		return newCandidates;
	}

	/**
	 * Get the closest coordinate to the origin from a given set.
	 *
	 * @param coordinates Coordinates to search within
	 * @return Closest coordinate to origin --- (0,0)
	 */
	getFirstMatchCoordinate(coordinates) {
		checkNotNull(coordinates);

		if(coordinates.length === 1) {
			return coordinates[0];
		}

		this.candidate = coordinates[0];

		// Search for a set of coordinates closer to the origin
		coordinates.forEach((coord)=>{
			if(coord.getX() <= this.candidate.getX() && coord.getY() <= this.candidate.getY()) {
				this.candidate = coord;
			}
		});

		return this.candidate;
	}

	/**
	 * Set matched tokens invalid.
	 *
	 * @param coordinates Set of matched coordinates in the S array
	 */
	setMatchesInvalid(coordinates) {
		checkNotNull(coordinates);

		if(coordinates.size === 0) {
			return;
		}

		// Iterate through all match coordinates and set them invalid
		let the = this;
		coordinates.forEach(function(coordinate){
			coordinate = Coordinate.from(coordinate);
			let x = coordinate.getX() - 1;
			let y = coordinate.getY() - 1;
			the.xList[x].valid = false;
			the.yList[y].valid = false;
		});
	}

	/**
	 * Retrieve a set of the coordinates that make up a match.
	 *
	 * @param matchCoord Coordinate of the end of the match. Must be within the S array.
	 * @return Set of all coordinates that form the match
	 */
	getMatchCoordinates(matchCoord) {
		checkNotNull(matchCoord);
		checkArgument(this.wholeArray.contains(matchCoord), "Requested match coordinate is out of bounds: " + matchCoord + " not within " + this.wholeArray);
		checkArgument(this.s[Coordinate.from(matchCoord.getX(),matchCoord.getY())], "Requested match coordinate " + matchCoord + " points to 0 in S array!");

		let matchCoordinates = [];

		let x = matchCoord.getX();
		let y = matchCoord.getY();

		let largestPredecessor = 1;
		while(largestPredecessor > 0) {
			// Only add the current coordinate if the tokens at the given point match
			let yToken = this.xList[x - 1];
			let xToken = this.yList[y - 1];
			if(yToken.valid && xToken.valid && xToken.lexeme === yToken.lexeme && xToken.type === yToken.type) {
				matchCoordinates.push(Coordinate.from(x, y));

				// If they match, the predecessor is always the upper-left diagonal
				x = x - 1;
				y = y - 1;

				largestPredecessor = this.s[Coordinate.from(x,y)] || 0;
			}
			else{
				// Get predecessors
				let a = this.s[Coordinate.from(x - 1,y - 1)] || 0;
				let b = this.s[Coordinate.from(x - 1,y)] || 0;
				let c = this.s[Coordinate.from(x,y - 1)] || 0;

				largestPredecessor = Math.max(a, b, c);

				// Figure out which predecessor is the largest, and move to its coordinates
				if(a === largestPredecessor) {
					x = x - 1;
					y = y - 1;
				}
				else if(b === largestPredecessor) {
					x = x - 1;
				}
				else if(c === largestPredecessor) {
					y = y - 1;
				}
				else {
					throw new Error("Unreachable code!");
				}
			}
		}

		return matchCoordinates;
	}

	/**
	 * Get the coordinate with the largest value in the S matrix from a given set to check.
	 *
	 * @param toTest Set of coordinates to check within
	 * @return Coordinate from toTest which maps to the largest value in the S matrix. Ties broken arbitrarily.
	 */
	getMaxOfCoordinates(toTest) {
		checkNotNull(toTest);
		checkArgument(!toTest.isEmpty(), "Cannot get the maximum of an empty set of coordinates!");

		let candidate = toTest[0];
		let value = this.s[Coordinate.from(candidate.getX(),candidate.getY())];

		toTest.forEach(function(newCandidate) {
			let newValue = this.s[Coordinate.from(newCandidate.getX(),newCandidate.getY())];

			if(newValue > value) {
				candidate = newCandidate;
				value = newValue;
			}
		});

		return candidate;
	}

	/**
	* Merge given map leto the Candidates list.
	*
	* @param merge Map to merge leto candidates
	*/
	mergeIntoCandidates(merge) {
		checkNotNull(merge);

		Object.entries(merge).forEach((entry)=>{
			let key = entry[0];
			let contentsToMerge = entry[1];
			if(!(key in this.candidates)) {
				this.candidates[key] = contentsToMerge;
			}
			else {
				let contentsMergeInto = this.candidates[key];
				contentsMergeInto.addAll(contentsToMerge);
			}
		});
	}
}
