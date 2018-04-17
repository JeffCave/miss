'use strict';

import {checkNotNull} from '../../../util/misc.js';
import {MatrixPrinterRegistry} from '../../../visualizations/similaritymatrix/output/MatrixPrinterRegistry.js';


(function(){


// As odd as it may seem, this is meant to be global, and blocking.
//
// The synchronous nature of this request allows the download to
// complete as part of the current file completing its work of
// defining the class. Since the class is not completely defined
// without the template, it is reasonable to block processing until
// this class is fully defined.
//
// Having said that, it would be better if the entire system worked
// asynchronously. It doesn't, so idiosynchracies will need to exist.
//
//TODO: change this to be non blocking
let template = 'scripts/visualizations/similaritymatrix/output/htmlOutput.tmpl.html';
var xhr = new XMLHttpRequest();
xhr.open('GET', template, false);
xhr.send();
if (xhr.status === 200) {
	template = xhr.responseText;
}
else{
	throw new Error("Could not resolve resource for HTML output template!");
}


/**
 * Print a Similarity Matrix as a color-coded HTML page.
 *
 * Uses Velocity templating
 *
 * @param matrix Matrix to print
 * @return HTML representation of given matrix
 * @throws InternalAlgorithmError Thrown on internal error processing matrix
 */
MatrixPrinterRegistry.processors['html'] = function(matrix){

	checkNotNull(matrix);

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


