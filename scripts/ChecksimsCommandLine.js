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

import {AlgorithmRegistry} from '/scripts/algorithm/AlgorithmRegistry.js';
import {CommonCodeLineRemovalPreprocessor} from '/scripts/algorithm/preprocessor/CommonCodeLineRemovalPreprocessor.js';
import {PreprocessorRegistry} from '/scripts/algorithm/preprocessor/PreprocessorRegistry.js';
//import net.lldp.checksims.algorithm.preprocessor.SubmissionPreprocessor;
//import net.lldp.checksims.algorithm.similaritymatrix.output.MatrixPrinter;
import {MatrixPrinterRegistry} from '/scripts/algorithm/similaritymatrix/output/MatrixPrinterRegistry.js';
import {Submission} from '/scripts/submission/Submission.js';
import {TokenType} from '/scripts/token/TokenType.js';
import {Tokenizer} from '/scripts/token/tokenizer/Tokenizer.js';

import {ChecksimsRunner} from './ChecksimsRunner.js';
import {JSZip} from 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js';

import {ChecksimsConfig} from '/scripts/ChecksimsConfig.js';

import {ChecksimsException} from '/scripts/ChecksimsException.js';
import { checkNotNull,checkArgument } from '/scripts/util/misc.js';


/**
 * Parses Checksims' command-line options.
 *
 * TODO: Consider changing from a  class? Having the CommandLine as an instance variable would greatly simplify
 */
export class ChecksimsCommandLine {
	constructor() {
	}


	/**
	 * @param anyRequired Whether any arguments are required
	 * @return CLI options used in Checksims
	 */
	getOpts(anyRequired) {
		let opts = {

			"a" : {
				opt: "a",
				longOpt: "algorithm",
				hasArg:true,
				argName:"name",
				desc: ("algorithm to compare with")
			},

			"t" : {
				opt:"t",
				longOpt:("token"),
				hasArg:true,
				argName:("type"),
				desc:("tokenization to use for submissions"),
			},

			"o" : {
				opt:"o",
				longOpt:("output"),
				hasArgs:true,
				argName:("name1[,name2,...]"),
				valueSeparator:(','),
				desc:("output format(s) to use, comma-separated if multiple given")
			},

			"f":{
				opt:("f"),
				longOpt:("file"),
				hasArg:true,
				argName:("filename"),
				desc:("print output to given file")
			},

			"p" : {
				opt:("p"),
				longOpt:("preprocess"),
				hasArgs:true,
				argName:("name1[,name2,...]"),
				valueSeparator:(','),
				desc:("preprocessor(s) to apply, comma-separated if multiple given")
			},

			"j" : {
				opt:("j"),
				longOpt:("jobs"),
				hasArg:true,
				argName:("num"),
				desc:("number of threads to use")
			},

			"g" : {
				opt:("g"),
				longOpt:("glob"),
				hasArg:true,
				argName:("matchpattern"),
				desc:("match pattern to determine files included in submissions")
			},

			"v" : {
				opt:("v"),
				longOpt:"verbosity",
				hasArg:true,
				argName:("verbosity"),
				desc:("Number of verbose ")
			},

			"h": {
				opt:"h",
				longOpt:"help",
				hasArg:false,
				desc:"show usage information"
			},
			"e": {opt:"e", longOpt:"empty", hasArg:false, desc:"retain empty submissions"},
			"c" : {
				opt:("c")
				,longOpt:("common")
				,hasArg:true
				,argName:("path")
				,desc:("directory containing common code which will be removed from all submissions")
			},

			"r":{opt:"r", longOpt:"recursive", hasArg:false,desc:"recursively traverse subdirectories to generate submissions"},
			"ver": {opt:"ver",longOpt:"version", hasArg:false, desc:"print version of Checksims"},

			"archive": {
				opt:("archive")
				,longOpt:("archivedir")
				,desc:("archive submissions - compared to main submissions but not each other")
				,argName:("path")
				,hasArgs:true,
				valueSeparator:('*')
			},

			"s": {
				opt:("s")
				,longOpt:("submissiondir")
				,desc:("directory or directories containing submissions to compare - mandatory!")
				,argName:("path")
				,hasArgs:true
				,valueSeparator:('*')
				,required:(anyRequired === true)
			},
		};

		return opts;
	}

	/**
	 * Parse a given set of CLI arguments into a Commons CLI CommandLine.
	 *
	 * @param args Arguments to parse
	 * @param anyRequired Whether arguments should be required
	 * @return CommandLine from parsed arguments
	 * @throws ParseException Thrown on error parsing arguments
	 */
	parseOpts(args, anyRequired = false) {
		checkNotNull(args);
		// Parse the CLI args
		let opts = this.getOpts(anyRequired);
		return JSON.merge([opts, args]);
	}

	/**
	 * Parse basic CLI flags and produce a ChecksimsConfig.
	 *
	 * @param cli Parsed command line
	 * @return Config derived from parsed CLI
	 * @throws ChecksimsException Thrown on invalid user input or internal error
	 */
	parseBaseFlags(cli = null){
		checkNotNull(cli);

		// Create a base config to work from
		let config = new ChecksimsConfig();

		// Parse plagiarism detection algorithm
		if(cli.hasOption("a")) {
			config = config.setAlgorithm(AlgorithmRegistry.getInstance().getImplementationInstance(cli.getOptionValue("a")));
			config = config.setTokenization(config.getAlgorithm().getDefaultTokenType());
		}

		// Parse tokenization
		if(cli.hasOption("t")) {
			config = config.setTokenization(TokenType.fromString(cli.getOptionValue("t")));
		}

		// Parse number of threads to use
		if(cli.hasOption("j")) {
			let numThreads = Number.parseInt(cli.getOptionValue("j"),10);

			if(numThreads < 1) {
				throw new ChecksimsException("Thread count must be positive!");
			}

			config = config.setNumThreads(numThreads);
		}

		// Parse preprocessors
		// Ensure no duplicates
		if(cli.hasOption("p")) {
			let preprocessors = [];

			let preprocessorsToUse = cli.getOptionValues("p");
			preprocessorsToUse.forEach(function(s){
				let p = PreprocessorRegistry.getInstance().getImplementationInstance(s);
				preprocessors.add(p);
			});
			config = config.setPreprocessors(preprocessors);
		}

		// Parse output strategies
		// Ensure no duplicates
		if(cli.hasOption("o")) {
			let desiredStrategies = cli.getOptionValues("o");
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
	parseFileFlags(cli, baseConfig) {
		checkNotNull(cli);
		checkNotNull(baseConfig);

		let toReturn = new ChecksimsConfig(baseConfig);

		// Get glob match pattern
		// Default to *
		let globPattern = cli.getOptionValue("g", "*");

		// Check if we are recursively building
		let recursive = cli.hasOption("r");

		// Check if we are retaining empty submissions
		let retainEmpty = cli.hasOption("e");

		// Get the tokenizer specified by base config
		let tokenizer = Tokenizer.getTokenizer(baseConfig.getTokenization());

		// Get submission directories
		if(!cli.hasOption("s")) {
			throw new ChecksimsException("Must provide at least one submission directory!");
		}

		let submissionDirsString = cli.getOptionValues("s");

		// Make a Set<File> from those submission directories
		// Map to absolute file, to ensure no dups
		let submissionDirs = new Set(submissionDirsString);
		if(submissionDirs.size === 0) {
			throw new ChecksimsException("Must provide at least one submission directory!");
		}

		// Generate submissions
		let submissions = this.getSubmissions(submissionDirs, globPattern, tokenizer, recursive, retainEmpty);

		console.log.debug("Generated " + submissions.size() + " submissions to process.");

		if(submissions.isEmpty()) {
			throw new ChecksimsException("Could build any submissions to operate on!");
		}

		toReturn = toReturn.setSubmissions(submissions);

		// Check if we need to perform common code removal
		if(cli.hasOption("c")) {
			// Get the directory containing the common code
			let commonCodeDirString = cli.getOptionValue("c");

			// Make a file from it
			let commonCodeDir = new File(commonCodeDirString).getAbsoluteFile();

			console.debug("Creating common code submission " + commonCodeDir.getName());

			// Verify that it's not a submission dir
			if(submissionDirs.contains(commonCodeDir)) {
				throw new ChecksimsException("Common code directory cannot be a submission directory!");
			}

			// All right, parse common code
			let commonCodeSubmission = Submission.submissionFromDir(commonCodeDir, globPattern, tokenizer, recursive);
			if(commonCodeSubmission.getContentAsString().isEmpty()) {
				console.warn("Common code is empty --- cowardly refusing to perform common code removal!");
			}
			else {
				let commonCodeRemover = new CommonCodeLineRemovalPreprocessor(commonCodeSubmission);

				// Common code removal first, always
				let oldPreprocessors = toReturn.getPreprocessors().splice(0);
				oldPreprocessors.add(0, commonCodeRemover);

				toReturn = toReturn.setPreprocessors(oldPreprocessors);
			}
		}

		// Check if we need to add archive directories
		if(cli.hasOption("archive")) {
			let archiveDirsString = cli.getOptionValues("archive");

			// Convert them into a set of files, again using getAbsoluteFile
			let archiveDirs = archiveDirsString;

			// Ensure that none of them are also submission directories
			archiveDirs.forEach(function(archiveDir){
				if(submissionDirs.contains(archiveDir)) {
					throw new ChecksimsException("Directory is both an archive directory and submission directory: " + archiveDir.getAbsolutePath());
				}
			});

			// Get set of archive submissions
			let archiveSubmissions = this.getSubmissions(archiveDirs, globPattern, tokenizer, recursive, retainEmpty);

			console.debug("Generated " + archiveSubmissions.size() + " archive submissions to process");

			if(archiveSubmissions.size === 0) {
				console.warn("Did not find any archive submissions to test with!");
			}

			toReturn = toReturn.setArchiveSubmissions(archiveSubmissions);
		}

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
		checkArgument(!submissionDirs.isEmpty(), "Must provide at least one submission directory!");
		checkNotNull(glob);
		checkNotNull(tokenizer);

		// Generate submissions to work on
		let submissions = new Set();
		submissionDirs.forEach(function(dir){
			console.debug("Adding directory " + dir.getName());
			submissions.addAll(Submission.submissionListFromDir(dir, glob, tokenizer, recursive));
		});

		// If not retaining empty submissions, filter the empty ones out
		if(!retainEmpty) {
			let submissionsNoEmpty = new Set();

			submissions.forEach(function(s) {
				if(s.getContentAsString().isEmpty()) {
					console.warn("Discarding empty submission " + s.getName());
				}
				else {
					submissionsNoEmpty.add(s);
				}
			});

			return submissionsNoEmpty;
		}

		return submissions;
	}

	/**
	 * Parse CLI arguments and run Checksims from them.
	 *
	 * TODO add unit tests
	 *
	 * @param args CLI arguments to parse
	 */
	runCLI(args){
		checkNotNull(args);

		// Parse options, first round: nothing required, so we can check for --help and --version
		let cli = parseOpts(args, false);

		// Print CLI Help
		if(cli.hasOption("h")) {
			this.printHelp();
		}

		// Print version
		if(cli.hasOption("version")) {
			console.log("Checksims version " + ChecksimsRunner.getChecksimsVersion());
			return;
		}

		// Parse options, second round: required arguments are required
		cli = parseOpts(args, true);

		// Parse verbose setting
		if(cli.hasOption("vv")) {
			logs = startLogger(2);
		}
		else if(cli.hasOption("v")) {
			logs = startLogger(1);
		}
		else {
			logs = startLogger(0);
		}

		// First, parse basic flags
		let config = this.parseBaseFlags(cli);

		// Parse file flags
		let finalConfig = this.parseFileFlags(cli, config);

		// Run Checksims with this config
		let output = ChecksimsRunner.runChecksims(finalConfig);

		// Check if file output specified
		if(cli.hasOption("f")) {
			// Writing to a file
			// Get the filename
			let outfileBaseName = cli.getOptionValue("f");

			// Output for all specified strategies
			Object.keys(output).forEach(function(strategy){
				// Final filename is the basename specified through CLI, with the strategy name as its extension.
				let outfile = new File(outfileBaseName + "." + strategy);

				console.log("Writing " + strategy + " output to " + outfile.getName());

				FileUtils.writeStringToFile(outfile, output.get(strategy), 'utf-8');
			});
		}
		else {
			// Just outputting to STDOUT
			Object.keys(output).forEach(function(strategy){
				System.out.println("\n\n");
				System.out.println("Output from " + strategy + "\n");
				System.out.println(output.get(strategy));
			});
		}

		console.log("CLI parsing complete!");
	}
}
