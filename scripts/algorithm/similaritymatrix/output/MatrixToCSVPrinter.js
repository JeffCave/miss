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
global checkNotNull
global MatrixPrinter
*/
loader.load([
	,'/scripts/algorithm/similaritymatrix/output/MatrixPrinter.js'
	,'/scripts/ChecksimsException.js'
	,'/scripts/util/misc.js'
]);

/**
 * Print a Similarity Matrix as machine-readable CSV.
 */
class MatrixToCSVPrinter extends MatrixPrinter {
	constructor(){
		if('instance' in MatrixToCSVPrinter){
			throw Error('Meant to be a singleton. Use "getInstance"');
		}
		super();


		MatrixToCSVPrinter.instance = this;
	}

	/**
	 * @return Singleton instance of MatrixToCSVPrinter
	 */
	static getInstance() {
		if(!('instance' in MatrixToCSVPrinter)) {
			MatrixToCSVPrinter.instance = new MatrixToCSVPrinter();
		}
		return MatrixToCSVPrinter.instance;
	}

	/**
	 * Print a Similarity Matrix in CSV format.
	 *
	 * @param matrix Matrix to print
	 * @return CSV representation of matrix
	 * @throws InternalAlgorithmError Thrown on internal error processing matrix
	 */
	printMatrix(matrix){
		checkNotNull(matrix);

		let builder = [];

		// First row: NULL, then all the Y submissions, comma-separated
		let row = [null];
		for(let y = 0; y < matrix.ySubmissions.length; y++) {
			row.push(matrix.ySubmissions[y].getName());
		}
		builder.push(row);

		// Remaining rows: X label, then all Y results in order
		for(let x = 0; x < matrix.xSubmissions.length; x++) {
			// First, append name of the X submission
			row = [matrix.xSubmissions[x].getName()];
			// Next, append all the matrix values, formatted as given
			for(let y = 0; y < matrix.ySubmissions.length; y++) {
				let entry = matrix.getEntryFor(x, y);
				let pct = entry.getSimilarityPercent();
				row.push(pct);
			}
			builder.push(row);
		}

		builder = builder
			.map(function(row){
				return JSON.stringify(row)
					.replace(/^\[/,'')
					.replace(/]$/,'')
					;
			})
			.join('\n')
			;
		return builder;
	}

	getName() {
		return "csv";
	}

	toString() {
		return "Singleton matrix of MatrixToCSVPrinter";
	}

	hashCode() {
		return this.getName().hashCode();
	}

	equals(other) {
		return other instanceof 'MatrixToCSVPrinter';
	}
}
