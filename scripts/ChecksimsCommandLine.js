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

global ChecksimsConfig
global ChecksimsException
global ChecksimsRunner
global CommonCodeLineRemovalPreprocessor
global MatrixPrinterRegistry
global Submission
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


	/**
	 * Parse flags which require submissions to be built.
	 *
	 * TODO unit tests
	 *
	 * @param cli Parse CLI options
	 * @param baseConfig Base configuration to work off
	 * @return Modified baseConfig with submissions (and possibly common code and archive submissions) changed
	 * @throws ChecksimsException Thrown on bad argument
	 * @throws IOException Thrown on error building submissions
	 */
	async loadFiles(cli, baseConfig) {
		checkNotNull(cli);
		checkNotNull(baseConfig);

		let toReturn = new ChecksimsConfig(baseConfig);

		// Get glob match pattern
		// Default to *
		let globPattern = new RegExp(cli.regex,'ig') || /.*/;

		// Check if we are recursively building
		let recursive = !(cli.recurse != false);

		// Check if we are retaining empty submissions
		let retainEmpty = cli.empty;

		// Get the tokenizer specified by base config
		let tokenizer = Tokenizer.getTokenizer(baseConfig.getTokenization());

		// Generate submissions
		let submissions = await Submission.submissionsFromZip(this.submissions, globPattern, tokenizer, recursive, retainEmpty);
		console.log("Generated " + submissions.length + " submissions to process.");
		if(submissions.length === 0) {
			throw new ChecksimsException("Could not build any submissions to operate on!");
		}
		toReturn = toReturn.setSubmissions(submissions);


		// All right, parse common code
		let commonCodeSubmission = await Submission.submissionsFromZip(this.common, globPattern, tokenizer, recursive, false);
		commonCodeSubmission = commonCodeSubmission.shift();
		if(!commonCodeSubmission){
			commonCodeSubmission = Submission.NullSubmission;
		}
		let commonCodeRemover = new CommonCodeLineRemovalPreprocessor(commonCodeSubmission);
		// Common code removal first, always
		let preprocessors = toReturn.getPreprocessors().splice(0);
		preprocessors.unshift(commonCodeRemover);
		toReturn = toReturn.setPreprocessors(preprocessors);


		// Check if we need to perform common code removal
		if(this.archive) {
			// Get set of archive submissions
			let archiveSubmissions = Submission.submissionsFromZip(this.archive, globPattern, tokenizer, recursive, retainEmpty);
			console.debug("Generated " + archiveSubmissions.length + " archive submissions to process");
			toReturn = toReturn.setArchiveSubmissions(archiveSubmissions);
		}

		return toReturn;
	}

	async renderResults(results,htmlContainers){
		let deduplicatedStrategies = Array.from(new Set(['html','csv']));
		if(deduplicatedStrategies.length === 0) {
			throw new ChecksimsException("Error: did not obtain a valid output strategy!");
		}

		// Output using all output printers
		let outputMap = deduplicatedStrategies
			.map(function(name){
				return MatrixPrinterRegistry.getInstance().getImplementationInstance(name);
			})
			.reduce(function(a,p){
				console.log("Generating " + p.getName() + " output");
				a[p.getName()] = p.printMatrix(results);
				return a;
			},{})
			;

		// Output for all specified strategies
		Object.entries(outputMap).forEach(function(strategy){
			let key = strategy[0];
			let val = strategy[1];
			if(key in htmlContainers){
				htmlContainers[key].querySelector('.result').innerHTML = val;
			}
		});


	}

	/**
	 * Parse CLI arguments and run Checksims from them.
	 *
	 * TODO add unit tests
	 *
	 * @param args CLI arguments to parse
	 */
	async runHtml(args,htmlContainers){
		checkNotNull(args);

		let checkSims = new ChecksimsRunner();

		// Parse options, second round: required arguments are required
		let cli = JSON.merge([checkSims.getOpts(),args]);

		// First, parse basic flags
		let config = checkSims.parseBaseFlags(cli);

		// Parse file flags
		let finalConfig = this.loadFiles(cli, config);

		// Run Checksims with this config
		let output = await checkSims.runChecksims(finalConfig);

		this.renderResults(output,htmlContainers);
	}
}
