'use strict';

import {ChecksimsException} from './ChecksimsException.js';
import {ChecksimsRunner} from './ChecksimsRunner.js';
import {d3ForceDirected} from './visualizations/force.js';
import {SimilarityMatrix} from './visualizations/similaritymatrix/SimilarityMatrix.js';
import {MatrixPrinterRegistry} from './visualizations/similaritymatrix/output/MatrixPrinterRegistry.js';
import {Submission} from './submission/Submission.js';

import './visualizations/similaritymatrix/output/MatrixToCSVPrinter.js';
import './visualizations/similaritymatrix/output/MatrixToHTMLPrinter.js';

/**
 * Parses Checksims' command-line options.
 *
 * TODO: Consider changing from a  class? Having the CommandLine as an instance variable would greatly simplify
 */
class ChecksimsCommandLine {
	constructor() {
		this.runner = new ChecksimsRunner();
	}

	attachSubmissions(blob){
		let parent = this;
		this.submissions = null;
		// 1) read the Blob
		return JSZip
			.loadAsync(blob)
			.then(function(zip) {
				let files = Submission.fileListFromZip(zip);
				return files;
			})
			.then(function(zip){
				parent.runner.Submissions = zip;
				return zip;
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

		let resultsMatrix = await SimilarityMatrix.generateMatrix(results);

		// Output using all output printers
		for(let i = 0; i < deduplicatedStrategies.length; i++){
			let name = deduplicatedStrategies[i];
			if(name in htmlContainers){
				console.log("Generating " + name + " output");
				let output = MatrixPrinterRegistry.processors[name];
				output = await output(resultsMatrix);
				htmlContainers[name].querySelector('.result').innerHTML = output;
			}
		}
	}

	renderListTable(results,htmlContainers){
		let cellTemplate = "  <td><meter min='-1' max='100' value='{{pct}}' title='{{pct}}% similar'></meter><span title='{{pct}}% similar'>{{name}}</span> </td>";
		let html = [
				'<thead>',
				' <tr>',
				'  <th>Student</th>',
				'  <th>Student</th>',
				' </tr>',
				'</thead>',
				'<tbody>',
			];
		html = html.concat(results.results
			.map(function(d){
				let rtn = [
						{'name':d.A.submission.name,'pct':d.A.percentMatched},
						{'name':d.B.submission.name,'pct':d.B.percentMatched}
					].sort(function(a,b){
						let diff = b.pct - a.pct;
						return diff;
					});
				rtn.total = rtn[0].pct + rtn[1].pct;
				return rtn;
			})
			.sort(function(a,b){
				let diff = b.total - a.total;
				return diff;
			})
			.map(function(comp){
				let html = comp.map(function(d){
						return cellTemplate
							.replace(/{{name}}/g,d.name)
							.replace(/{{pct}}/g,(d.pct * 100).toFixed(0))
							;
					}).join('');
				html = [' <tr>', html, '</tr>',];
				return html.join('\n');
			}))
			;
		html.push('</tbody>');

		let lst = htmlContainers.lst;
		lst = lst.querySelector('.result');
		lst.innerHTML = html.join('\n');
	}


	renderListForce(results,htmlContainers){
		//let container = htmlContainers.force.querySelector('ul.result');
		//let dimensions = window.getComputedStyle(container);
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
		let checkSims = this.runner;

		checkSims.CommonCode = this.common;
		checkSims.ArchiveSubmissions = this.archive;
		let results = await checkSims.runChecksims();

		this.renderResults(results,htmlContainers);
	}

}



window.addEventListener('load',function(){
	let checker = new ChecksimsCommandLine();
	let button = document.querySelector('button');
	let upload = document.querySelector("input[name='zip']");

	button.disabled = true;
	upload.disabled = false;

	let outputFlds = Array.from(document.querySelectorAll('#results > details'))
		.reduce(function(a,d){
			if(d.dataset.type){
				a[d.dataset.type] = d;
			}
			return a;
		},{})
		;

	button.addEventListener('click',function(e){
		checker.runHtml(outputFlds);
	});

	upload.addEventListener('change',function(e){
		Array.from(e.target.files).forEach(function(file){
			if (!file.type === 'application/x-zip-compressed'){
				return;
			}
			checker.attachSubmissions(file)
				.then(function(files){
					button.disabled = false;
					let ul = document.querySelector("ul");
					ul.innerHTML = Object.keys(files)
						.sort()
						.map((file)=>{
							return '<li>'+file+'</li>';
						})
						.join('')
						;
				})
				;
		});
	});
});

