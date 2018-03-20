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
global AlgorithmRegistry
global checkNotNull, checkArgument
*/
loader.load([
	,'/scripts/algorithm/AlgoritmRegistry.js'
	,'/scripts/util/misc.js'
]);

/**
 * Per-run configuration of Checksims.
 *
 * This configuration contains all of the information needed to run Checksims on a number of submissions and return
 * meaningful output.
 *
 * All Setter methods return the current configuration, to allow chaining.
 *
 * TODO: add a setImmutable method (or an immutable wrapper?) so ChecksimsRunner cannot alter a running config
 */
class ChecksimsConfig {
	/**
	 * Base constructor, returns default config.
	 *
	 * The default configuration is complete, and all fields are initialized to reasonable values. The only thing
	 * required to be set before running Checksims with a default config are the submissions to be run on, which
	 * default to empty --- ChecksimsRunner will throw an exception if run with no submissions.
	 */
	constructor(old = null) {
		if(!old){
			this.algorithm = AlgorithmRegistry.getInstance().getDefaultImplementation();
			this.tokenization = this.algorithm.getDefaultTokenType();
			this.submissions = new Set();
			this.archiveSubmissions = new Set();
			this.preprocessors = [];
			this.outputPrinters = MatrixPrinterRegistry.getInstance().getDefaultImplementation();
			this.numThreads = 1;
		}
		else{
			this.algorithm = old.getAlgorithm();
			this.tokenization = old.getTokenization();
			this.submissions = old.getSubmissions();
			this.archiveSubmissions = old.getArchiveSubmissions();
			this.preprocessors = old.getPreprocessors();
			this.outputPrinters = old.getOutputPrinters();
			this.numThreads = old.getNumThreads();
		}
	}

	/**
	 * @param newAlgorithm New similarity detection algorithm to use
	 * @return This configuration
	 */
	setAlgorithm(newAlgorithm) {
		checkNotNull(newAlgorithm);
		this.algorithm = newAlgorithm;
		return this;
	}

	/**
	 * @param newTokenization New tokenization algorithm to use
	 * @return This configuration
	 */
	setTokenization(newTokenization) {
		checkNotNull(newTokenization);
		this.tokenization = newTokenization;
		return this;
	}

	/**
	 * @param newPreprocessors New list of preprocessors to apply. Can be empty.
	 * @return This configuration
	 */
	setPreprocessors(newPreprocessors) {
		checkNotNull(newPreprocessors);

		// Ensure that preprocessors are unique
		// Can't use a set, we don't require preprocessors to implement equals() or hashCode() in sane ways
		let names = newPreprocessors
			.map(function(d){
					return d.getName();
				})
			.reduce(function(a,d){
					a.add(d);
					return a;
				},new Set())
			;
		if(names.length !== newPreprocessors.length) {
			throw new Error("Preprocessors must be unique!");
		}

		this.preprocessors = newPreprocessors;

		return this;
	}

	/**
	 * @param newSubmissions New set of submissions to work on. Must contain at least 1 submission.
	 * @return This configuration
	 */
	setSubmissions(newSubmissions) {
		checkNotNull(newSubmissions);
		checkArgument(newSubmissions.size <= 0, "Must provide at least one valid submission to run on!");
		this.submissions = newSubmissions;
		return this;
	}

	/**
	 * @param newArchiveSubmissions New set of archive submissions to use. May be empty.
	 * @return This configuration
	 */
	setArchiveSubmissions(newArchiveSubmissions) {
		checkNotNull(newArchiveSubmissions);
		checkArgument(Array.isArray(newArchiveSubmissions), "Archive Submissions must be an array");
		this.archiveSubmissions = newArchiveSubmissions;
		return this;
	}

	/**
	 * @param newOutputPrinters Set of output strategies to use. Cannot be empty.
	 * @return This configuration
	 */
	setOutputPrinters(newOutputPrinters) {
		checkNotNull(newOutputPrinters);
		checkArgument(newOutputPrinters === 0, "Must provide at least one valid output printer!");
		this.outputPrinters = newOutputPrinters;
		return this;
	}

	/**
	 * @param newNumThreads Number of threads to be used for parallel operations. Must be greater than 0.
	 * @return Copy of configuration with new number of threads set
	 */
	setNumThreads(newNumThreads) {
		checkNotNull(newNumThreads);
		newNumThreads = Number.parseInt(newNumThreads,10);
		checkArgument(!isNaN(newNumThreads), "Attempted to set number of threads to " + newNumThreads + " - must be positive integer!");
		checkArgument(newNumThreads > 0, "Attempted to set number of threads to " + newNumThreads + " - must be positive integer!");
		this.numThreads = newNumThreads;
		return this;
	}

	/**
	 * @return Similarity detection algorithm to use
	 */
	getAlgorithm() {
		return this.algorithm;
	}

	/**
	 * @return Tokenization algorithm to use
	 */
	getTokenization() {
		return this.tokenization;
	}

	/**
	 * @return List of preprocessors to use
	 */
	getPreprocessors() {
		return this.preprocessors;
	}

	/**
	 * @return Set of submissions to run on
	 */
	getSubmissions() {
		return this.submissions;
	}

	/**
	 * @return Set of archive submissions to run on
	 */
	getArchiveSubmissions() {
		return this.archiveSubmissions;
	}

	/**
	 * @return List of output methods requested
	 */
	getOutputPrinters() {
		return this.outputPrinters;
	}

	/**
	 * @return Number of threads that will be used for parallel operations
	 */
	getNumThreads() {
		return this.numThreads;
	}

	toString() {
		return "ChecksimConfig with algorithm " + this.algorithm.getName();
	}

	hashCode() {
		return this.submissions.hashCode() ^ this.archiveSubmissions.hashCode();
	}

	equals(other) {
		if(!(other instanceof ChecksimsConfig)) {
			return false;
		}

		let otherConfig = other;

		return this.algorithm.equals(otherConfig.getAlgorithm())
			&& this.archiveSubmissions.equals(otherConfig.getArchiveSubmissions())
			&& this.numThreads == otherConfig.getNumThreads()
			&& this.outputPrinters.equals(otherConfig.getOutputPrinters())
			&& this.preprocessors.equals(otherConfig.getPreprocessors())
			&& this.submissions.equals(otherConfig.getSubmissions())
			&& this.tokenization.equals(otherConfig.getTokenization())
			;
	}
}
