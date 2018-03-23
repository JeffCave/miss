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
global PreprocessSubmissions
global SimilarityMatrix
global PairGenerator
global ChecksimsException
global checkNotNull
*/
loader.load([
	,'/scripts/algorithm/AlgorithmRunner.js'
	,'/scripts/algorithm/preprocessor/PreprocessSubmissions.js'
	,'/scripts/algorithm/similaritymatrix/SimilarityMatrix.js'
	,'/scripts/util/PairGenerator.js'
	,'/scripts/ChecksimsException.js'
	,'/scripts/util/misc.js'
]);


/**
 * CLI Entry point and main public API endpoint for Checksims.
 */
class ChecksimsRunner {

	constructor() {

	}

	/**
	 * Get current version.
	 *
	 * @return Current version of Checksims
	 */
	static getChecksimsVersion(){
		return "0.0.0";
	}

	/**
	 * Main public entrypoint to Checksims. Runs similarity detection according to given configuration.
	 *
	 * @param config Configuration defining how Checksims will be run
	 * @return Map containing output of all output printers requested. Keys are name of output printer.
	 * @throws ChecksimsException Thrown on error performing similarity detection
	 */
	static async runChecksims(config){
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

		// Output using all output printers
		let outputMap = config.getOutputPrinters().reduce(function(a,p){
				console.log("Generating " + p.getName() + " output");
				a[p.getName()] = p.printMatrix(resultsMatrix);
				return a;
			},{})
			;

		return outputMap;

	}
}
