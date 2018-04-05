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
global PairGenerator
global PreprocessSubmissions
global PreprocessorRegistry
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
	,'/scripts/ChecksimsException.js'
	,'/scripts/util/misc.js'
]);


/**
 * CLI Entry point and main public API endpoint for Checksims.
 */
class ChecksimsRunner {

	constructor() {
		this.numThreads = 1;
		this.commonCode = async function(){return Submission.NullSubmission;};
	}

	get Filter(){
		if(!('globPattern' in this)){
			this.globPattern = new RegExp('.*','ig');
		}
		return this.globPattern;
	}
	set Filter(value){
		// Get glob match pattern
		// Default to *
		this.globPattern = new RegExp(value,'ig') || /.*/;
	}

	/**
	 * @return Similarity detection algorithm to use
	 */
	get Algorithm() {
		if(!('algorithm' in this)){
			this.algorithm = AlgorithmRegistry.getInstance().getImplementationInstance('smithwaterman');
		}
		return this.algorithm;
	}
	/**
	 * @param newAlgorithm New similarity detection algorithm to use
	 * @return This configuration
	 */
	set Algorithm(newAlgorithm) {
		checkNotNull(newAlgorithm);
		if(typeof newAlgorithm === 'string'){
			newAlgorithm = AlgorithmRegistry.getInstance().getImplementationInstance(newAlgorithm);
		}

		this.algorithm = newAlgorithm;
	}
	get AlgorithmRegistry(){
		return AlgorithmRegistry.getInstance();
	}

	/**
	 * @return Set of submissions to run on
	 */
	get Submissions() {
		return this.submissions;
	}
	/**
	 * @param newSubmissions New set of submissions to work on. Must contain at least 1 submission.
	 * @return This configuration
	 */
	set Submissions(newSubmissions) {
		checkNotNull(newSubmissions);
		this.submissions = Submission.submissionsFromZip(newSubmissions, this.Filter);
	}


	/**
	 * @return Set of archive submissions to run on
	 */
	get ArchiveSubmissions() {
		return this.archiveSubmissions;
	}
	/**
	 * @param newArchiveSubmissions New set of archive submissions to use. May be empty.
	 * @return This configuration
	 */
	set ArchiveSubmissions(newArchiveSubmissions) {
		if(!newArchiveSubmissions){
			this.archiveSubmissions = [];
		}
		else{
			this.archiveSubmissions = Submission.submissionsFromZip(newArchiveSubmissions, this.Filter);
		}
	}


	/**
	 * @return Set of archive submissions to run on
	 */
	get CommonCode() {
		return this.commonCode;
	}
	/**
	 * @param newArchiveSubmissions New set of archive submissions to use. May be empty.
	 * @return This configuration
	 */
	set CommonCode(newCommonCode) {
		if(!newCommonCode){
			newCommonCode = null;
		}
		// All right, parse common code
		this.commonCode = Submission.submissionsFromZip(newCommonCode, this.Filter);
	}


	/**
	 * @return Number of threads that will be used for parallel operations
	 */
	get NumThreads() {
		return this.numThreads;
	}
	/**
	 * @param newNumThreads Number of threads to be used for parallel operations. Must be greater than 0.
	 * @return Copy of configuration with new number of threads set
	 */
	set NumThreads(newNumThreads) {
		checkNotNull(newNumThreads);
		newNumThreads = Number.parseInt(newNumThreads,10);
		checkArgument(!isNaN(newNumThreads), "Attempted to set number of threads to " + newNumThreads + " - must be a number!");
		checkArgument(newNumThreads > 0, "Attempted to set number of threads to " + newNumThreads + " - must be positive integer!");
		this.numThreads = newNumThreads;
	}


	/**
	 * Get current version.
	 *
	 * @return Current version of Checksims
	 */
	static get Version(){
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
	async runChecksims(){
		let allSubmissions = await Promise.all([this.Submissions,this.archiveSubmissions]);

		let submissions = allSubmissions[0];
		let archiveSubmissions = allSubmissions[1];
		if(2 > submissions.length + archiveSubmissions.length) {
			throw new ChecksimsException("Did not get at least 2 student submissions! Cannot run Checksims!");
		}
		console.log("Got " + archiveSubmissions.length + " archive submissions to test.");

		// Apply all preprocessors
		let registry = await PreprocessorRegistry.getInstance();
		let preprocessors = registry.getSupportedImplementationNames();
		preprocessors = preprocessors
			.filter(function(name){
				return name !== 'commoncodeline';
			});
		preprocessors = preprocessors
			.map(function(name){
				let implementation = registry.getImplementationInstance(name);
				return implementation;
			});
		// Common code removal first, always
		let the = this;
		preprocessors.unshift((async function(resolve){
			let common = await the.CommonCode();
			common = new CommonCodeLineRemovalPreprocessor(common);
			return common;
		})());
		preprocessors = await Promise.all(preprocessors);
		preprocessors.forEach(function(p){
			submissions = Array.from(PreprocessSubmissions.process(p, submissions));
			archiveSubmissions = Array.from(PreprocessSubmissions.process(p, archiveSubmissions));
		});
		// Apply algorithm to submissions
		let allPairs = await PairGenerator.generatePairsWithArchive(submissions, archiveSubmissions);
		let algo = await this.Algorithm;
		let results = AlgorithmRunner.runAlgorithm(allPairs, algo);

		//TODO: do this with web workers
		// All parallel jobs are done, shut down the parallel executor
		//ParallelAlgorithm.shutdownExecutor();

		let report = {
			"results" : results,
			"submissions":submissions,
			"archives":archiveSubmissions
		};
		return report;

	}

	/**
	 * @param anyRequired Whether any arguments are required
	 * @return CLI options used in Checksims
	 */
	/*
	static get defaultOpts() {
		let opts = {
			"algorithm" : "smithwaterman",
			"tokenizer" :TokenType.WHITESPACE,
			"preproc" : ['commoncodeline','lowercase','deduplicate'],
			"threads" : 1,
			"regex" : '.*',
			// common code to be ignored (instructor code)
			"commDir" : null,
			// use archive (old student assignments)
			"archDir": null,
			// submissions (current student assignemnts)
			"subDir": null,
		};
		return opts;
	}
	*/


}
