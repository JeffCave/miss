'use strict';

import {checkNotNull} from '../../../util/misc.js';
import {MatrixPrinterRegistry} from '../../../visualizations/similaritymatrix/output/MatrixPrinterRegistry.js';

/*
global fetch
global Mustache
*/


(function(){

let template = fetch('scripts/DeepDiff/visualizations/similaritymatrix/output/htmlOutput.tmpl.html')
	.then(function(response) {
		if(response.status !== 200){
			throw new Error("Could not resolve resource for HTML output template!");
		}
		let text = response.text();
		return text;
	})
	;

/**
 * Print a Similarity Matrix as a color-coded HTML page.
 *
 * Uses Velocity templating
 *
 * @param matrix Matrix to print
 * @return HTML representation of given matrix
 * @throws InternalAlgorithmError Thrown on internal error processing matrix
 */
MatrixPrinterRegistry.processors['html'] = async function(matrix){
	checkNotNull(matrix);

	template = await template;

	let context = {
		"matrix": matrix,
		"toFixed": function() {
			return function(num, render) {
				return (parseFloat(render(num))*100).toFixed(0);
			};
		}
	};
	let output = Mustache.render (template, context);
	return output;
};



})();


