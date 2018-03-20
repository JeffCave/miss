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
 * When distributing Covered Code, include this CDDL HEADER in each
 * file and include the License file at LICENSE.txt.
 * If applicable, add the following below this CDDL HEADER, with the
 * fields enclosed by brackets "[]" replaced with your own identifying
 * information: Portions Copyright [yyyy] [name of copyright owner]
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
global Mustache
*/
loader.load([
	,'https://cdnjs.cloudflare.com/ajax/libs/mustache.js/2.3.0/mustache.min.js'
	,'/scripts/ChecksimsException.js'
	,'/scripts/util/misc.js'
	,'/scripts/algorithm/similaritymatrix/output/MatrixPrinter.js'
]);

/**
 * Print a Similarity Matrix to HTML.
 */
class MatrixToHTMLPrinter extends MatrixPrinter {
	static get templateLocation(){
		return "/scripts/algorithm/similaritymatrix/output/htmlOutput.tmpl.html";
	}

	/**
	* @return Singleton instance of MatrixToHTMLPrinter
	*/
	static getInstance() {
		if(!('instance' in MatrixToHTMLPrinter)){
			MatrixToHTMLPrinter.instance = new MatrixToHTMLPrinter();
		}

		return MatrixToHTMLPrinter.instance;
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
	printMatrix(matrix){
		checkNotNull(matrix);

		let template = MatrixToHTMLPrinter.template;
		let context = {
			"matrix": matrix
		};
		let output = Mustache.render (template, context);
		return output.toString();
	}

	getName() {
		return "html";
	}

    toString() {
        return "Singleton instance of MatrixToHTMLPrinter";
    }

    hashCode() {
        return this.getName().hashCode();
    }

	equals(other) {
        return other instanceof MatrixToHTMLPrinter;
    }
}


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
var xhr = new XMLHttpRequest();
xhr.open('GET', MatrixToHTMLPrinter.templateLocation, false);
xhr.send();
if (xhr.status === 200) {
	MatrixToHTMLPrinter.prototype.template = xhr.responseText;
}
else{
	throw new Error("Could not resolve resource for HTML output template!");
}

