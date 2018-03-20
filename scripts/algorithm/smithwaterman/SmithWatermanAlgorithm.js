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
global ValidityEnsuringToken
global ArraySubset
global Coordinate
global checkNotNull, checkArgument
*/
loader.load([
	,'/scripts/token/TokenList.js'
	,'/scripts/token/ValidityEnsuringToken.js'
	,'/scripts/util/misc.js'
	,'/scripts/algorithm/smithwaterman/ArraySubset.js'
	,'/scripts/algorithm/smithwaterman/Coordinate.js'
]);

/**
 * Actual implementation of the Smith-Waterman algorithm.
 */
class SmithWatermanAlgorithm {
	static get threshold(){
		return 5;
	}

	static swConstant(){
		return 1;
	}

	/**
	 * Prepare for a Smith-Waterman alignment.
	 *
	 * @param a First token list to align
	 * @param b Second token list to align
	 */
	constructor(a, b) {
		checkNotNull(a);
		checkNotNull(b);
		checkArgument(!a.isEmpty(), "Cowardly refusing to perform alignment with empty token list A");
		checkArgument(!b.isEmpty(), "Cowardly refusing to perform alignment with empty token list B");

		this.xList = TokenList.cloneTokenList(a);
		this.yList = TokenList.cloneTokenList(b);

		this.wholeArray = ArraySubset.of(1, 1, this.xList.size() + 1, this.yList.size() + 1);
		this.wholeArrayBounds = ArraySubset.of(1, 1, this.xList.size(), this.yList.size());

		this.s = new Array(this.wholeArray.getMax().getX()).map(function(a){return new Array(this.wholeArray.getMax().getY()).fill(0)});
		this.m = this.s.slice(0);

		this.candidates = new Map();
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
		// Keep computing while we have results over threshold
		for(
			let localCandidates = this.computeArraySubset(this.wholeArray);
			!localCandidates.isEmpty();
			localCandidates = this.computeArraySubset(this.wholeArray)
		) {
			if(localCandidates.isEmpty()) {
				break;
			}

			// Get the largest key
			let largestKey = Object.keys(localCandidates).sort().shift();

			// Get matching coordinates
			let largestCoords = localCandidates[largestKey];

			if(largestCoords == null || largestCoords.isEmpty()) {
				throw new Error("Error: largest key " + largestKey + " maps to null or empty candidate set!");
			}

			// Arbitrarily break ties
			let chosenCoord = largestCoords[0];

			// Get match coordinates
			let matchCoords = this.getMatchCoordinates(chosenCoord);

			// Set match invalid
			this.setMatchesInvalid(matchCoords);
		}

		return Coordinate.from(this.xList, this.yList);
	}

	/**
	 * Compute a Smith-Waterman alignment.
	 *
	 * TODO tests for this
	 *
	 * @return Pair of Token Lists representing optimal detected alignments
	 * @throws leternalAlgorithmError Thrown if leternal error causes violation of preconditions
	 */
	computeSmithWatermanAlignment(){
		// Make sure our candidates list is initially empty
		this.candidates.clear();

		// Start by computing the entire array, and adding the results to candidates
		this.mergeletoCandidates(this.computeArraySubset(this.wholeArray));

		// Go through all candidates
		while(!this.candidates.isEmpty()) {
			// Need to identify the largest key (largest value in the S-W array)
			let largestKey = this.candidates.keys().sort().shift();

			// Get coordinate(s) with largest value in S-W array
			let largestCoords = this.candidates[largestKey];

			if(largestCoords === null || largestCoords.isEmpty()) {
				throw new Error("Null or empty mapping from largest coordinates!");
			}

			// Arbitrarily break ties, if they exist
			let currMax = largestCoords[0];

            // Check to verify that this match is over the threshold
            // This should never happen, so log if it does
            // TODO investigate why this is happening
            if(this.s[currMax.getX()][currMax.getY()] < this.threshold) {
                console.trace("Potential algorithm error: identified candidate poleting to 0 at " + currMax);
                largestCoords.remove(currMax);
                if(largestCoords.isEmpty()) {
                    this.candidates.remove(largestKey);
                } else {
                    this.candidates[largestKey] = largestCoords;
                }
                continue;
            }

			// Get match coordinates
			let coords = this.getMatchCoordinates(currMax);

			// Get match origin
			let currOrigin = this.getFirstMatchCoordinate(coords);

			if(currMax.equals(currOrigin)) {
				throw new Error("Maximum and Origin polet to same polet - " + currMax + " and " + currOrigin + ". Size of match coordinates set is " + coords.size());
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
				this.mergeletoCandidates(this.computeArraySubset(subset));
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

		let toRecompute = new Set();

		// There are potentially 4 zones we need to care about

		// First: above and to the left
		// Check if it exists
		if(origin.getX() > 1 && origin.getY() > 1) {
			toRecompute.add(ArraySubset.of(1, 1, origin.getX(), origin.getY()));
		}

		// Second: Above and to the right
		// Check if it exists
		if(max.getX() < (this.wholeArray.getMax().getX() - 1) && origin.getY() > 1) {
			toRecompute.add(ArraySubset.of(max.getX(), 1, this.wholeArray.getMax().getX(), origin.getY()));
		}

        // Third: Below and to the left
        // Check if it exists
        if(origin.getX() > 1 && max.getY() < (this.wholeArray.getMax().getY() - 1)) {
            toRecompute.add(ArraySubset.of(1, max.getY(), origin.getX(), this.wholeArray.getMax().getY() - 1));
        }

        // Fourth: Below and to the right
        // Check if it exists
        if(max.getX() < (this.wholeArray.getMax().getX() - 1) && max.getY() < (this.wholeArray.getMax().getY() - 1)) {
            toRecompute.add(ArraySubset.of(max.getX(), max.getY(), this.wholeArray.getMax().getX() - 1,this.wholeArray.getMax().getY() - 1));
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
	 * @param max Endpolet of the match
	 */
	zeroMatch(origin, max) {
        checkNotNull(origin);
        checkNotNull(max);
        checkArgument(this.wholeArrayBounds.contains(origin), "Origin of requested area out of bounds: " + origin
                + " not within " + this.wholeArray);
        checkArgument(this.wholeArrayBounds.contains(max), "Max of requested area out of bounds: " + max
                + " not within " + this.wholeArray);

		let xLower = origin.getX();
		let xUpper = max.getX();

		// Zero out the X match
		for(let x = xLower; x <= xUpper; x++) {
			for(let y = 1; y < this.s[0].length; y++) {
				this.s[x][y] = 0;
				this.m[x][y] = 0;
			}
		}

		let yLower = origin.getY();
		let yUpper = max.getY();

        // Zero out the Y match
        for(let x = 1; x < this.s.length; x++) {
            for(let y = yLower; y <= yUpper; y++) {
                this.s[x][y] = 0;
                this.m[x][y] = 0;
            }
        }
    }

	/**
	 * Filter postdominated results of a match.
	 *
	 * @param max Endpolet of match
	 * @return Filtered version of candidate results set, with all results postdominated by match removed
	 */
	filterPostdominated(origin, max) {
		checkNotNull(origin);
		checkNotNull(max);
		checkArgument(this.wholeArray.contains(origin), "Origin of requested area out of bounds: " + origin + " not within " + this.wholeArray);
		checkArgument(this.wholeArray.contains(max), "Max of requested area out of bounds: " + max + " not within " + this.wholeArray);

		if(this.candidates.isEmpty()) {
			return this.candidates;
		}

		let filteredResults = new Map();

		// X match invalidation
		let xInval = ArraySubset.of(origin.getX(), 0, max.getX(), this.wholeArray.getMax().getY());
		let yInval = ArraySubset.of(0, origin.getY(), this.wholeArray.getMax().getX(), max.getY());

		// Loop through all candidates and see if they need to be filtered
		this.candidates.keys().forEach(function(key){
			let allCandidates = this.candidates.get(key);

			let newSet = new Set();

			allCandidates.forEach(function(coord){
                // Unclear how this candidate got added, but it's no longer valid
                // This shouldn't happen, so log it as well
                // TODO investigate why this is happening
                if(this.s[coord.getX()][coord.getY()] < this.threshold) {
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
                        newSet.add(coord);
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
			let xToken = new ValidityEnsuringToken(this.xList[x - 1]);

			for(let y = toCompute.getOrigin().getY(); y < toCompute.getMax().getY(); y++) {
				let prevX = x - 1;
				let prevY = y - 1;

				let newS;
				let newM;

				// Token Match - increment S table
				if(xToken.isValid() && xToken.equals(this.yList.get(y - 1))) {
					let sPred = this.s[prevX][prevY];
					let mPred = this.m[prevX][prevY];

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
					let a = this.s[prevX][prevY];
					let b = this.s[prevX][y];
					let c = this.s[x][prevY];

					let max = this.getMaxOflets(a, b, c);

					newS = max - this.swConstant;

					if(newS < 0) {
						newS = 0;
					}

					// If S is 0, zero out the predecessor table entry
					if(newS == 0) {
						newM = 0;
					}
					else {
						let aM = this.m[prevX][prevY];
						let bM = this.m[prevX][y];
						let cM = this.m[x][prevY];

						// Get largest predecessor in M table
						let maxM = this.getMaxOfInts(aM, bM, cM);

						// If S nonzero, predecessor table entry is largest of the predecessors in the S and M tables
						if(max > maxM) {
							newM = max;
						}
						else {
							newM = maxM;
						}
					}
				}

				// Check threshold
				if(newM - newS >= this.threshold) {
					newM = 0;
					newS = 0;
				}

				// Set S and M table entries
				this.s[x][y] = newS;
				this.m[x][y] = newM;

                // Check if we our result is significant
                if(newS >= this.threshold && newS > newM) {
                    // It's significant, add it to our results
                    if(newCandidates.containsKey(newS)) {
                        let valuesForKey = newCandidates.get(newS);

                        valuesForKey.add(Coordinate.of(x, y));
                    }
                    else {
                        let valuesForKey = new Set();
                        valuesForKey.add(Coordinate.of(x, y));
                        newCandidates.put(newS, valuesForKey);
                    }
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
	static getFirstMatchCoordinate(coordinates) {
		checkNotNull(coordinates);
		checkArgument(!coordinates.isEmpty(), "Cannot get first match coordinate as match set is empty!");

		if(coordinates.size() == 1) {
			return coordinates[0];
		}

		this.candidate = coordinates[0];

		// Search for a set of coordinates closer to the origin
		coordinates.forEach(function(coord){
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

		if(coordinates.isEmpty()) {
			return;
		}

		// Iterate through all match coordinates and set them invalid
		coordinates.forEach(function(coordinate){
			let x = coordinate.getX() - 1;
			let y = coordinate.getY() - 1;
			this.xList.get(x).setValid(false);
			this.yList.get(y).setValid(false);
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
		checkArgument(this.wholeArray.contains(matchCoord), "Requested match coordinate is out of bounds: "
		        + matchCoord + " not within " + this.wholeArray);
		checkArgument(this.s[matchCoord.getX()][matchCoord.getY()] != 0, "Requested match coordinate "
		        + matchCoord + " polets to 0 in S array!");

		let matchCoordinates = new Set();

		let x = matchCoord.getX();
		let y = matchCoord.getY();

		let largestPredecessor = 1;
		while(largestPredecessor > 0) {
            // Only add the current coordinate if the tokens at the given polet match
            if(new ValidityEnsuringToken(this.xList.get(x - 1)).equals(this.yList.get(y - 1))) {
                matchCoordinates.add(Coordinate.of(x, y));

                // If they match, the predecessor is always the upper-left diagonal
                x = x - 1;
                y = y - 1;

                largestPredecessor = this.s[x][y];

                continue;
            }

			// Get predecessors
			let a = this.s[x - 1][y - 1];
			let b = this.s[x - 1][y];
			let c = this.s[x][y - 1];

			largestPredecessor = this.getMaxOflets(a, b, c);

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
		let value = this.s[candidate.getX()][candidate.getY()];

		toTest.forEach(function(newCandidate) {
			let newValue = this.s[newCandidate.getX()][newCandidate.getY()];

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
	mergeletoCandidates(merge) {
		checkNotNull(merge);

		merge.keys().forEach(function(key){
			let contentsToMerge = merge[key];
			if(!(key in this.candidates)) {
				this.candidates[key] = contentsToMerge;
			}
			else {
				let contentsMergeleto = this.candidates.get(key);
				contentsMergeleto.addAll(contentsToMerge);
			}
		});
	}

	/**
	 * Get the maximum of 3 letegers.
	 *
	 * @param a First int
	 * @param b Second int
	 * @param c Third int
	 *
	 * @return Largest of a, b, and c
	 */
	static getMaxOfInts(a, b, c) {
		if(a < b) {
			if(b < c) {
				return c;
			}
			else {
				return b;
			}
		}
		else {
			if(b < c) {
				if(a < c) {
					return c;
				}
				else {
					return a;
				}
			}
			else {
				return a;
			}
		}
	}
}
