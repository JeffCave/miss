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

/*
global loader

global AlgorithmRunner
global AlgorithmRegistry
global ChecksimsException
global ChecksimsConfig
global PairGenerator
global PreprocessSubmissions
global TokenType
global SimilarityMatrix

global checkNotNull
*/
loader.load([
	,'/scripts/algorithm/AlgorithmRunner.js'
	,'/scripts/algorithm/AlgorithmRegistry.js'
	,'/scripts/algorithm/preprocessor/PreprocessSubmissions.js'
	,'/scripts/algorithm/similaritymatrix/SimilarityMatrix.js'
	,'/scripts/token/TokenType.js'
	,'/scripts/util/PairGenerator.js'
	,'/scripts/ChecksimsConfig.js'
	,'/scripts/ChecksimsException.js'
	,'/scripts/util/misc.js'
]);


/**
 * CLI Entry point and main public API endpoint for Checksims.
 */
class ChecksimsRunner {

	constructor() {
		this.config = new ChecksimsConfig();
	}

	/**
	 * Get current version.
	 *
	 * @return Current version of Checksims
	 */
	static get ChecksimsVersion(){
		return "0.0.0";
	}


	/**
	 * Main public entrypoint to Checksims. Runs similarity detection
	 * according to given configuration.
	 *
	 * @param config Configuration defining how Checksims will be run
	 * @return Map containing output of all output printers requested. Keys are name of output printer.
	 * @throws ChecksimsException Thrown on error performing similarity detection
	 */
	async runChecksims(config){
		checkNotNull(config);
		config = await config;

		let submissions = new Promise((resolve,reject)=>{
			let submissions = config.getSubmissions();
			console.log("Got " + submissions.length + " submissions to test.");
			if(submissions.length === 0) {
				reject(new ChecksimsException("No student submissions were found - cannot run Checksims!"));
			}
			resolve(submissions);
		});
		let archiveSubmissions = new Promise((resolve,reject)=>{
			let archive = config.getArchiveSubmissions();
			console.log("Got " + archive.length + " archive submissions to test.");
			resolve(archive);
		});
		let allSubmissions = await Promise.all([submissions,archiveSubmissions]);

		submissions = allSubmissions[0];
		archiveSubmissions = allSubmissions[1];
		if(2 > submissions.length + archiveSubmissions.length) {
			throw new ChecksimsException("Did not get at least 2 student submissions! Cannot run Checksims!");
		}
		// Apply all preprocessors
		config.getPreprocessors().forEach(function(p){
			submissions = Array.from(PreprocessSubmissions.process(p, submissions));
			archiveSubmissions = Array.from(PreprocessSubmissions.process(p, archiveSubmissions));
		});
		// Apply algorithm to submissions
		let allPairs = await PairGenerator.generatePairsWithArchive(submissions, archiveSubmissions);
		let results = AlgorithmRunner.runAlgorithm(allPairs, config.getAlgorithm());
		let resultsMatrix = SimilarityMatrix.generateMatrix(results, submissions, archiveSubmissions);

		//TODO: do this with web workers
		// All parallel jobs are done, shut down the parallel executor
		//ParallelAlgorithm.shutdownExecutor();


		return resultsMatrix;

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

		return config;
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


}
