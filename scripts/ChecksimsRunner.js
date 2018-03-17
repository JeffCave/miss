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
global AlgorithmRunner
global PreprocessSubmissions
global SimilarityMatrix
global PairGenerator
global ChecksimsException
global checkNotNull
*/
/*
import {AlgorithmRunner} from '/scripts/algorithm/PreprocessSubmissions.js';
import {PreprocessSubmissions} from '/scripts/algorithm/preprocessor/PreprocessSubmissions.js';
import {SimilarityMatrix} from '/scripts/algorithm/similaritymatrix/SimilarityMatrix.js';
import {PairGenerator} from '/scripts/util/PairGenerator.js';

import { ChecksimsException } from '/scripts/ChecksimsException.js';
import { checkNotNull } from '/scripts/util/misc.js';
*/


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
	static runChecksims(config){
		checkNotNull(config);

		//TODO: do this with web workers
		// Set parallelism
		//let threads = config.getNumThreads();
		//ParallelAlgorithm.setThreadCount(threads);

		let submissions = config.getSubmissions();

		console.log("Got " + submissions.size() + " submissions to test.");

		let archiveSubmissions = config.getArchiveSubmissions();

		if(!archiveSubmissions.isEmpty()) {
			console.log("Got " + archiveSubmissions.size + " archive submissions to test.");
		}

		if(submissions.size === 0) {
			throw new ChecksimsException("No student submissions were found - cannot run Checksims!");
		}

		// Apply all preprocessors
		config.getPreprocessors().forEach(function(p){
			submissions = new Set(PreprocessSubmissions.process(p, submissions));

			if(!archiveSubmissions.isEmpty()) {
				archiveSubmissions = new Set(PreprocessSubmissions.process(p, archiveSubmissions));
			}
		});

		if(submissions.size < 2) {
			throw new ChecksimsException("Did not get at least 2 student submissions! Cannot run Checksims!");
		}

		// Apply algorithm to submissions
		let allPairs = PairGenerator.generatePairsWithArchive(submissions, archiveSubmissions);
		let results = AlgorithmRunner.runAlgorithm(allPairs, config.getAlgorithm());
		let resultsMatrix = SimilarityMatrix.generateMatrix(submissions, archiveSubmissions, results);

		//TODO: do this with web workers
		// All parallel jobs are done, shut down the parallel executor
		//ParallelAlgorithm.shutdownExecutor();

		// Output using all output printers
		let outputMap = config.getOutputPrinters()
			.reduce(function(a,p){
				console.log("Generating " + p.getName() + " output");
				a[p.getName()] = p.printMatrix(resultsMatrix);
				return a;
			},{});

		return outputMap;
	}
}
