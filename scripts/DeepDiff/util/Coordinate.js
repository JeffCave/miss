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
	Coordinate
};

/**
 * An immutable 2-D coordinate.
 */
export default class Coordinate{
	/**
	* Construct a 2D coordinate.
	*
	* @param x Desired X coordinate
	* @param y Desired Y coordinate
	*/
	constructor(x, y) {
		if(typeof x === 'string' && Number.isNaN(+x)){
			let val = JSON.parse(x);
			x = val.x;
			y = val.y;
		}

		if(x instanceof Object && 'y' in x){
			y = x.y;
			x = x.x;
		}

		this.x = +x;
		this.y = +y;
	}

	static from(x,y){
		if(x instanceof Coordinate){
			return x;
		}
		return new Coordinate(x,y);
	}

	/**
	* @return X coordinate
	*/
	getX() {
		return this.x;
	}

	/**
	 * @return Y coordinate
	 */
	getY() {
		return this.y;
	}

	/**
	 * @return X coordinate
	 */
	getLeft() {
		return this.x;
	}

	/**
	 * @return Y coordinate
	 */
	getRight() {
		return this.y;
	}

	equals(other) {
		if(!(other instanceof Coordinate)) {
			return false;
		}

		return (other.getX() == this.x) && (other.getY() == this.y);
	}

	hashCode() {
		return (5 * this.x) ^ (3 * this.y);
	}

	toString() {
		let val = {
			x: this.x,
			y: this.y
		};
		val = JSON.stringify(val);
		return val;
	}

}
