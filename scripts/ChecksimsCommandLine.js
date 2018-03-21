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

global AlgorithmRegistry
global ChecksimsConfig
global ChecksimsException
global ChecksimsRunner
global MatrixPrinterRegistry
global PreprocessorRegistry
global Submission
global Tokenizer
global TokenType

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
	 * @param anyRequired Whether any arguments are required
	 * @return CLI options used in Checksims
	 */
	getOpts() {
		let opts = {
			"algorithm" : "smithwaterman",
			"tokenizer" :TokenType.WHITESPACE,
			"preproc" : ['commoncodeline','lowercase','deduplicate'],
			"threads" : 1,
			"regex" : '.*',
			"verbosity" : 1,
			// retain empty folders
			"empty": true,
			// recurse folder structure
			"recurse":true,
			// common code to be ignored (instructor code)
			"commDir" : null,
			// use archive (old student assignments)
			"archDir": null,
			// submissions (current student assignemnts)
			"subDir": null,
		};
		return opts;
	}



	/**
	 * Parse basic CLI flags and produce a ChecksimsConfig.
	 *
	 * @param cli Parsed command line
	 * @return Config derived from parsed CLI
	 * @throws ChecksimsException Thrown on invalid user input or internal error
	 */
	parseBaseFlags(cli = {}){
		cli = JSON.merge([{},this.getOpts(),cli]);

		// Create a base config to work from
		let config = new ChecksimsConfig();

		// Parse plagiarism detection algorithm
		if('algo' in cli){
			let algo = AlgorithmRegistry.getInstance().getImplementationInstance(cli['algo']);
			config = config.setAlgorithm(algo);
			config = config.setTokenization(algo.getDefaultTokenType());
		}

		// Parse tokenization
		if('t' in cli) {
			config = config.setTokenization(TokenType.fromString(cli['t']));
		}

		// Parse number of threads to use
		if('j' in cli) {
			let numThreads = Number.parseInt(cli["j"],10);
			if(numThreads < 1) {
				throw new ChecksimsException("Thread count must be positive!");
			}
			config = config.setNumThreads(numThreads);
		}

		// Parse preprocessors
		// Ensure no duplicates
		if('p' in cli) {
			let preprocessors = [];

			let preprocessorsToUse = cli["p"];
			preprocessorsToUse.forEach(function(s){
				let p = PreprocessorRegistry.getInstance().getImplementationInstance(s);
				preprocessors.add(p);
			});
			config = config.setPreprocessors(preprocessors);
		}

		// Parse output strategies
		// Ensure no duplicates
		if('o' in cli) {
			let desiredStrategies = cli["o"];
			let deduplicatedStrategies = new Set(desiredStrategies);

			if(deduplicatedStrategies.size === 0) {
				throw new ChecksimsException("Error: did not obtain a valid output strategy!");
			}

			// Convert to MatrixPrinters
			let printers = deduplicatedStrategies.map(function(name){
				return MatrixPrinterRegistry.getInstance().getImplementationInstance(name);
			});

			config = config.setOutputPrinters(printers);
		}

		return config;
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
	loadFiles(cli, baseConfig) {
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
		this.getSubmissions(this.submissions, globPattern, tokenizer, recursive, retainEmpty)
			.then(function(submissions){
				console.log("Generated " + submissions.length + " submissions to process.");
				if(submissions.length === 0) {
					throw new ChecksimsException("Could not build any submissions to operate on!");
				}
				toReturn = toReturn.setSubmissions(submissions);
			});
		// // Check if we need to perform common code removal
		// if(cli.commDir) {
		// 	// Get the directory containing the common code
		// 	let commonCodeDirString = cli.getOptionValue("c");

		// 	// Make a file from it
		// 	let commonCodeDir = new File(commonCodeDirString).getAbsoluteFile();

		// 	console.debug("Creating common code submission " + commonCodeDir.getName());

		// 	// Verify that it's not a submission dir
		// 	if(submissionDirs.contains(commonCodeDir)) {
		// 		throw new ChecksimsException("Common code directory cannot be a submission directory!");
		// 	}

		// 	// All right, parse common code
		// 	let commonCodeSubmission = Submission.submissionFromDir(commonCodeDir, globPattern, tokenizer, recursive);
		// 	if(commonCodeSubmission.getContentAsString().isEmpty()) {
		// 		console.warn("Common code is empty --- cowardly refusing to perform common code removal!");
		// 	}
		// 	else {
		// 		let commonCodeRemover = new CommonCodeLineRemovalPreprocessor(commonCodeSubmission);

		// 		// Common code removal first, always
		// 		let oldPreprocessors = toReturn.getPreprocessors().splice(0);
		// 		oldPreprocessors.add(0, commonCodeRemover);

		// 		toReturn = toReturn.setPreprocessors(oldPreprocessors);
		// 	}
		// }

		// // Check if we need to add archive directories
		// if(cli.hasOption("archive")) {
		// 	let archiveDirsString = cli.getOptionValues("archive");

		// 	// Convert them into a set of files, again using getAbsoluteFile
		// 	let archiveDirs = archiveDirsString;

		// 	// Ensure that none of them are also submission directories
		// 	archiveDirs.forEach(function(archiveDir){
		// 		if(submissionDirs.contains(archiveDir)) {
		// 			throw new ChecksimsException("Directory is both an archive directory and submission directory: " + archiveDir.getAbsolutePath());
		// 		}
		// 	});

		// 	// Get set of archive submissions
		// 	let archiveSubmissions = this.getSubmissions(archiveDirs, globPattern, tokenizer, recursive, retainEmpty);

		// 	console.debug("Generated " + archiveSubmissions.size() + " archive submissions to process");

		// 	if(archiveSubmissions.size === 0) {
		// 		console.warn("Did not find any archive submissions to test with!");
		// 	}

		// 	toReturn = toReturn.setArchiveSubmissions(archiveSubmissions);
		// }

		return toReturn;
	}

	/**
	 * Build the collection of submissions Checksims will be run on.
	 *
	 * TODO add unit tests
	 *
	 * @param submissionDirs Directories to build submissions from
	 * @param glob Glob matcher to use when building submissions
	 * @param tokenizer Tokenizer to use when building submissions
	 * @param recursive Whether to recursively traverse when building submissions
	 * @return Collection of submissions which will be used to run Checksims
	 * @throws IOException Thrown on issue reading files or traversing directories to build submissions
	 */
	getSubmissions(submissionDirs, glob, tokenizer, recursive, retainEmpty){
		checkNotNull(submissionDirs);
		checkArgument(Object.keys(submissionDirs.files).length > 0, "Must provide at least one submission directory!");
		checkNotNull(glob);
		checkNotNull(tokenizer);

		// Divide entries by student
		let studentSubs = {};
		submissionDirs.forEach(function(name,entry){
			let key = name.split('/');
			key.shift();
			let student = key.shift();
			if(!entry.dir){
				if(!(student in studentSubs)){
					studentSubs[student] = [];
				}
				studentSubs[student].push(entry);
			}
		});

		// Generate submissions to work on
		let submissions = Object.entries(studentSubs).map(function(entry){
			let student = entry[0];
			let files = entry[1].filter(function(f){
					let result = glob.test(f.name);
					return result;
				});
			console.debug("Adding student: " + student);
			let submission = Submission.submissionFromFiles(student, files, tokenizer);
			return submission;
		});

		submissions = Promise.all(submissions)
			.then(function(submissions){
				submissions = submissions.filter(function(s){
					if(!retainEmpty) {
						if(s.getContentAsString() === '') {
							console.warn("Discarding empty submission " + s.getName());
						}
						else {
							return s;
						}
					}
					else{
						return s;
					}
				});
				return submissions;
			});

		return submissions;
	}

	/**
	 * Parse CLI arguments and run Checksims from them.
	 *
	 * TODO add unit tests
	 *
	 * @param args CLI arguments to parse
	 */
	runHtml(args){
		checkNotNull(args);

		// Parse options, second round: required arguments are required
		let cli = JSON.merge([this.getOpts(),args]);

		// First, parse basic flags
		let config = this.parseBaseFlags(cli);

		// Parse file flags
		let finalConfig = this.loadFiles(cli, config);

		// Run Checksims with this config
		ChecksimsRunner
			.runChecksims(finalConfig)
			.then(function(output){
				// Output for all specified strategies
				Object.keys(output).forEach(function(strategy){
					// Final filename is the basename specified through CLI, with the strategy name as its extension.
					let outfile = new File(outfileBaseName + "." + strategy);
					console.log("Writing " + strategy + " output to " + outfile.getName());
					FileUtils.writeStringToFile(outfile, output.get(strategy), 'utf-8');
					console.log("CLI parsing complete!");
				})
			})
			;

	}
}
