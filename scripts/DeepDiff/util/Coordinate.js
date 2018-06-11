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
 * A 2-D coordinate.
 */
export default class Coordinate extends Array{
	/**
	* Construct a 2D coordinate.
	*
	* @param x Desired X coordinate
	* @param y Desired Y coordinate
	*/
	constructor(x, y) {
		// resolve any JSON
		if(typeof x === 'string' && Number.isNaN(+x)){
			x = JSON.parse(x);
		}

		// convert objects to arrays
		if(x instanceof Object && 'y' in x){
			x = [x.x, x.y];
		}

		// convert parameters to an array
		if(!Number.isNaN(x) && !Number.isNaN(y)){
			x = [x, y];
		}

		super();

		// copy arrays to itself
		x.forEach((d,i)=>{
			this[i] = +d;
		});
	}

	static from(x,y){
		if(x instanceof Coordinate){
			return x;
		}
		return new Coordinate(x,y);
	}

	get x(){
		return this[0] || 0;
	}

	get y(){
		return this[1] || 0;
	}

	get z(){
		return this[2] || 0;
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
		let str = JSON.stringify(this);
		return str;
	}

}
