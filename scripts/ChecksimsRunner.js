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

		return Promise
			.all([submissions,archiveSubmissions])
			.then(function(allSubmissions){
				let submissions = allSubmissions[0];
				let archiveSubmissions = allSubmissions[1];
				// Apply all preprocessors
				config.getPreprocessors().forEach(function(p){
					submissions = new Set(PreprocessSubmissions.process(p, submissions));
					archiveSubmissions = new Set(PreprocessSubmissions.process(p, archiveSubmissions));
					if(submissions.length + archiveSubmissions.length < 2) {
						throw new ChecksimsException("Did not get at least 2 student submissions! Cannot run Checksims!");
					}
				});
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

				return new Promise((resolve)=>{resolve(outputMap);});
			})
			;

	}
}
