'use strict';

import {MatrixPrinterRegistry} from '../../../visualizations/similaritymatrix/output/MatrixPrinterRegistry.js';
import {checkNotNull} from '../../../util/misc.js';


(function(){

/**
 * Print a Similarity Matrix in CSV format.
 *
 * @param matrix Matrix to print
 * @return CSV representation of matrix
 * @throws InternalAlgorithmError Thrown on internal error processing matrix
 */
MatrixPrinterRegistry.processors['csv'] = function(matrix){
	checkNotNull(matrix);

	let builder = [];

	// First row: NULL, then all the Y submissions, comma-separated
	let row = [null];
	for(let y = 0; y < matrix.ySubmissions.length; y++) {
		row.push(matrix.ySubmissions[y].Name);
	}
	builder.push(row);

	// Remaining rows: X label, then all Y results in order
	for(let x = 0; x < matrix.xSubmissions.length; x++) {
		// First, append name of the X submission
		row = [matrix.xSubmissions[x].Name];
		// Next, append all the matrix values, formatted as given
		for(let y = 0; y < matrix.ySubmissions.length; y++) {
			let entry = matrix.getEntryFor(x, y);
			let pct = entry.similarityPercent;
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
};



})();
