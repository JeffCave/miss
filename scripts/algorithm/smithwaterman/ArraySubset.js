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
	ArraySubset
};

import {Coordinate} from '../../util/Coordinate.js';
import {checkNotNull,checkArgument} from '../../util/misc.js';

/**
 * An immutable subset of a 2-Dimensional Array.
 */
class ArraySubset {
	/**
	 * Construct a new array subset.
	 *
	 * @param origin Origin point. Must be closer to the origin (smaller in both X and Y!) than max
	 * @param max Point of maximum extent
	 */
	constructor(origin, max) {
		checkNotNull(origin);
		checkNotNull(max);
		checkArgument(origin.getX() < max.getX(), "Error creating array subset - maximum X of " + max.getX() + " not greater than origin X of " + origin.getX());
		checkArgument(origin.getY() < max.getY(), "Error creating array subset - maximum Y of " + max.getY() + " not greater than origin Y of " + origin.getY());

		this.origin = origin;
		this.max = max;
	}

	/**
	 * @param x1 X coordinate of origin
	 * @param y1 Y coordinate of origin
	 * @param x2 X coordinate of max
	 * @param y2 Y coordinate of max
	 * @return Array Subset built from given coordinates
	 */
	static from(x1, y1, x2, y2) {
		return new ArraySubset(Coordinate.from(x1, y1), Coordinate.from(x2, y2));
	}

	/**
	 * @return Coordinate representing the lower bound of this subset
	 */
	getOrigin() {
		return this.origin;
	}

	/**
	 * @return Coordinate representing the upper bound of this subset
	 */
	getMax() {
		return this.max;
	}

	/**
	 * @param toCheck Point to check
	 * @return True if given point is within this array subset
	 */
	contains(toCheck) {
		checkNotNull(toCheck);
		return (this.origin.getX() <= toCheck.getX() && toCheck.getX() <= this.max.getX()) && (this.origin.getY() <= toCheck.getY() && toCheck.getY() <= this.max.getY());
	}

	toString() {
		return "An array subset starting at " + this.origin.toString() + " and ending at " + this.max.toString();
	}

	hashCode() {
		return this.origin.hashCode() ^ this.max.hashCode();
	}

	equals(other) {
		if(!(other instanceof ArraySubset)) {
			return false;
		}
		return other.getOrigin().equals(this.origin) && other.getMax().equals(this.max);
	}
}
