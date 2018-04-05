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
global JSZip
global RegExp
global d3

global ChecksimsConfig
global ChecksimsException
global ChecksimsRunner
global CommonCodeLineRemovalPreprocessor
global MatrixPrinterRegistry
global Submission
global SimilarityMatrix
global Tokenizer

global checkArgument
global checkNotNull
*/

/**
 * Parses Checksims' command-line options.
 *
 * TODO: Consider changing from a  class? Having the CommandLine as an instance variable would greatly simplify
 */
class ChecksimsCommandLine {
	constructor() {
		this.submissions = null;
		this.archive = null;
		this.common = null;
	}

	attachSubmissions(blob){
		let parent = this;
		this.submissions = null;
		// 1) read the Blob
		return JSZip
			.loadAsync(blob)
			.then(function(zip) {
				parent.submissions = zip;
				//zip.forEach(function (relativePath, zipEntry) {
				//	// 2) print entries
				//	console.log(zipEntry.name);
				//	zipEntry
				//		.async("string")
				//		.on("data", function (data) { })
				//		.on("error", function (e) { })
				//		.on("end", function () { })
				//		;
				//});
			})
			.catch(function (e) {
				console.error("Error reading " + blob.name + ": " + e.message);
			})
			;
	}

	attachArchive(blob){
		let parent = this;
		this.archive = null;
		// 1) read the Blob
		return JSZip
			.loadAsync(blob)
			.then(function(zip) {
				parent.archive = zip;
			})
			.catch(function (e) {
				console.error("Error reading " + blob.name + ": " + e.message);
			})
			;
	}

	attachCommon(blob){
		let parent = this;
		this.common = null;
		// 1) read the Blob
		return JSZip
			.loadAsync(blob)
			.then(function(zip) {
				parent.common = zip;
			})
			.catch(function (e) {
				console.error("Error reading " + blob.name + ": " + e.message);
			})
			;
	}



	async renderMatrixes(results,htmlContainers){
		let deduplicatedStrategies = Array.from(new Set(['html','csv']));
		if(deduplicatedStrategies.length === 0) {
			throw new ChecksimsException("Error: did not obtain a valid output strategy!");
		}

		let resultsMatrix = SimilarityMatrix.generateMatrix(results);

		// Output using all output printers
		let outputMap = Promise.all(deduplicatedStrategies
			.map(function(name){
				return MatrixPrinterRegistry.getInstance().getImplementationInstance(name);
			}))
			.then(function(outputs){
				outputs = outputs
					.reduce(function(a,p){
						console.log("Generating " + p.getName() + " output");
						a[p.getName()] = p.printMatrix(resultsMatrix);
						return a;
					},{})
					;

				// Output for all specified strategies
				Object.entries(outputs).forEach(function(strategy){
					let key = strategy[0];
					let val = strategy[1];
					if(key in htmlContainers){
						htmlContainers[key].querySelector('.result').innerHTML = val;
					}
				});
		});
	}

	renderListTable(results,htmlContainers){
		let html = [
				'<thead>',
				' <tr>',
				'  <th colspan="2">Students</th>',
				'  <th colspan="2">Similarities</th>',
				' </tr>',
				'</thead>',
				'<tbody>',
			];
		html = html.concat(results.results
			.sort(function(a,b){
				let diff = b.percentMatchedA - a.percentMatchedA;
				if(diff === 0){
					diff = b.percentMatchedB - a.percentMatchedB;
				}
				return diff;
			})
			.map(function(comp){
				let html = [
						comp.a.name,
						comp.b.name,
						(comp.percentMatchedA * 100).toFixed(0) + '%',
						(comp.percentMatchedB * 100).toFixed(0) + '%',
					]
					;
				html = [
						' <tr><td>',
						html.join('</td><td>'),
						'</td></tr>',
					]
					;
				return html.join('\n');
			}))
			;
		html.push('</tbody>');

		let lst = htmlContainers.lst;
		lst = lst.querySelector('.result');
		lst.innerHTML = html.join('\n');
	}


	renderListForce(results,htmlContainers){
		let container = htmlContainers.force.querySelector('ul.result');
		let dimensions = window.getComputedStyle(container);

		d3ForceDirected(results);
	}

	async renderResults(results,htmlContainers){
		this.renderMatrixes(results,htmlContainers);
		this.renderListTable(results,htmlContainers);
		this.renderListForce(results,htmlContainers);
	}

	/**
	 * Parse CLI arguments and run Checksims from them.
	 *
	 * TODO add unit tests
	 *
	 * @param args CLI arguments to parse
	 */
	async runHtml(htmlContainers){
		let checkSims = new ChecksimsRunner();
		checkSims.Submissions = this.submissions;
		checkSims.CommonCode = this.common;
		checkSims.ArchiveSubmissions = this.archive;
		let results = await checkSims.runChecksims();

		this.renderResults(results,htmlContainers);
	}




}
