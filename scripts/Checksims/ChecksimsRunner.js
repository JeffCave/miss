'use strict';
export {
	ChecksimsRunner
};

import './algorithm/smithwaterman/SmithWaterman.js';
import './preprocessor/LowercasePreprocessor.js';
import './preprocessor/WhitespaceDeduplicationPreprocessor.js';
import {AlgorithmRegistry} from './algorithm/AlgorithmRegistry.js';
import {CommonCodeLineRemovalPreprocessor} from './preprocessor/CommonCodeLineRemovalPreprocessor.js';
import {PairGenerator} from './util/PairGenerator.js';
import {Submission} from './submission/Submission.js';

import "https://cdnjs.cloudflare.com/ajax/libs/pouchdb/6.4.3/pouchdb.min.js";
import "./lib/pouchdb.upsert.min.js";

import * as utils from './util/misc.js';

/*
global PouchDB
*/

/**
 * CLI Entry point and main public API endpoint for Checksims.
 */
class ChecksimsRunner {

	constructor() {
		this.numThreads = 1;
		this.results = {};
		this.submissions = {};
		this.db = new PouchDB('checksim');
		this.dbInit();
	}

	dbInit(){
		let self = this;
		this.db.upsert('_design/checksims',function(doc){
			let designDoc = {
				views:{
					submissions:{
						map: function(doc){
							if(doc._id.startsWith('submission.')){
								let key = doc._id.split('.');
								let val = doc.hash;
								emit(key,val);
							}
						}.toString()
					}
				},
				filters: {
					submissions: function (doc,req) {
						let isSub = doc._id.startsWith('submission.');
						return isSub;
					}.toString()
				}
			};
			if(utils.docsEqual(doc,designDoc)){
				console.log('DB version: no change');
				return false;
			}
			console.log('DB version: updating');
			return designDoc;
		})
		.then(function(){
			self.db
				.changes({filter:'checksims/submissions'})
				.on('change', function(e) {
					console.log('Submission change');
					self.runChecksims();
				});
		});
	}

	get Filter(){
		if(!('globPattern' in this)){
			this.globPattern = new RegExp('.*','i');
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
			this.algorithm = AlgorithmRegistry.processors['smithwaterman'];
		}
		return this.algorithm;
	}
	/**
	 * @param newAlgorithm New similarity detection algorithm to use
	 * @return This configuration
	 */
	set Algorithm(newAlgorithm) {
		utils.checkNotNull(newAlgorithm);
		if(typeof newAlgorithm === 'string'){
			newAlgorithm = AlgorithmRegistry.processors[newAlgorithm];
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
		this.db.query()
	}

	/**
	 * @param newSubmissions New set of submissions to work on. Must contain at least 1 submission.
	 * @return This configuration
	 */
	async addSubmissions(newSubmissions) {
		utils.checkNotNull(newSubmissions);
		if(newSubmissions instanceof Submission){
			newSubmissions = [newSubmissions];
		}
		if(!Array.isArray(newSubmissions)){
			newSubmissions = Submission.submissionsFromFiles(newSubmissions, this.Filter);
		}
		for(let d=0; d<newSubmissions.length; d++){
			let newSub = newSubmissions[d];
			if(newSub.name in this.Submissions){
				let hash = await newSub.hash;
				if(this.Submissions[newSub.name] === hash){
					continue;
				}
			}
			this.Submissions[newSub.name] = newSub;
			let self = this;
			let newDoc = await newSub.toJSON();
			self.db.upsert('submission.'+newSub.name,function(oldDoc){
				newDoc = JSON.parse(newDoc);
				if(utils.docsEqual(newDoc,oldDoc)){
					return false;
				}
				return newDoc;
			});
		}
	}


	/**
	 * @return Set of archive submissions to run on
	 */
	get ArchiveSubmissions() {
		if(!('archiveSubmissions' in this)){
			this.archiveSubmissions = [];
		}
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
			this.archiveSubmissions = Submission.submissionsFromFiles(newArchiveSubmissions, this.Filter);
		}
	}


	/**
	 * @return Set of archive submissions to run on
	 */
	get CommonCode() {
		if(!('commonCode' in this)){
			this.commonCode = (async function(){return Submission.NullSubmission;})();
		}
		return this.commonCode;
	}
	/**
	 * @param newArchiveSubmissions New set of archive submissions to use. May be empty.
	 * @return This configuration
	 */
	set CommonCode(newCommonCode) {
		// All right, parse common code
		this.commonCode = Submission.submissionsFromFiles(newCommonCode, this.Filter);
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
		utils.checkNotNull(newNumThreads);
		newNumThreads = Number.parseInt(newNumThreads,10);
		utils.checkArgument(!isNaN(newNumThreads), "Attempted to set number of threads to " + newNumThreads + " - must be a number!");
		utils.checkArgument(newNumThreads > 0, "Attempted to set number of threads to " + newNumThreads + " - must be positive integer!");
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
		let allSubmissions = await Promise.all([this.Submissions,this.ArchiveSubmissions]);

		let submissions = Object.values(allSubmissions[0]);
		let archiveSubmissions = allSubmissions[1];

		console.log("Got " + archiveSubmissions.length + " archive submissions to test.");

		// Common code removal first, always
		let the = this;
		let common = await the.CommonCode;
		common = CommonCodeLineRemovalPreprocessor(common);
		// Apply the preprocessors to the submissions
		[submissions,archiveSubmissions].forEach(function(group){
				group.forEach(function(submission){
					submission.Common = common;
				});
			});

		// Apply algorithm to submissions
		let allPairs = await PairGenerator.generatePairsWithArchive(submissions, archiveSubmissions);
		let algo = await this.Algorithm;
		// Perform parallel analysis of all submission pairs to generate a results list
		let currentResults = Object.keys(this.results);
		let results = allPairs
			.filter(function(pair){
				let name = pair.map((d)=>d.name).sort().join('.');
				let existingPosition = currentResults.indexOf(name);
				if(existingPosition >= 0){
					currentResults.splice(existingPosition,1);
					return false;
				}
				return true;
			})
			.map(function(pair){
				return algo(pair[0], pair[1]);
			})
			;

		console.log("Performing similarity detection on " + submissions.length + " pairs");
		let self = this;
		results.forEach(function(result){
			console.log("Beginning similarity detection on '"+result.name+"'");
			let startTime = Date.now();
			result.then(function(d){
					self.results[d.name] = d;
					let endTime = Date.now();
					let timeElapsed = endTime - startTime;
					console.log("Finished similarity detection on '" + d.name + "' (" + timeElapsed + " ms)");
				})
				;
		});
	}

}
