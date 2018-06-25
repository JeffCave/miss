'use strict';
export {
	DeepDiff
};

import './algorithm/smithwaterman/SmithWaterman.js';
import './preprocessor/LowercasePreprocessor.js';
import './preprocessor/WhitespaceDeduplicationPreprocessor.js';
import {AlgorithmRegistry} from './algorithm/AlgorithmRegistry.js';
import * as AlgorithmResults from './algorithm/AlgorithmResults.js';
import {CommonCodeLineRemovalPreprocessor} from './preprocessor/CommonCodeLineRemovalPreprocessor.js';
import {Submission} from './submission/Submission.js';

import "https://cdnjs.cloudflare.com/ajax/libs/pouchdb/6.4.3/pouchdb.min.js";
import "./lib/pouchdb.upsert.min.js";

import * as utils from './util/misc.js';

/*
global PouchDB
global emit
*/

/**
 * CLI Entry point and main public API endpoint for DeepDiff.
 */
class DeepDiff {

	constructor() {
		this.numThreads = 1;
		this._results = {};
		this.submissions = {};
		this.db = new PouchDB('DeepDiff');
		this._events = {
			'submissions':{},
			'results':{},
		};
		this.dbInit();
	}

	async dbInit(){
		let self = this;
		await this.db.upsert('_design/checksims',function(doc){
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
					},
					results:{
						map: function(doc){
							if(doc._id.startsWith('result.')){
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
					}.toString(),
					results: function (doc,req) {
						let isResult = doc._id.startsWith('result.');
						return isResult;
					}.toString()
				},
				validate_doc_update:function (newDoc, oldDoc){
					if(utils.docsEqual(newDoc,oldDoc)){
						throw({
							code:304,
							forbidden:'Document has not significantly changed'
						});
					}
				}.toString()
			};
			if(utils.docsEqual(doc,designDoc)){
				console.log('DB version: no change');
				return false;
			}
			console.log('DB version: updating');
			return designDoc;
		});
		self.runAllCompares();
		Object.entries(this._events).forEach((eventType)=>{
			let opts = ['checksims',eventType[0]].join('/');
			opts = {
				filter:opts,
				since:'now',
				live:true,
				include_docs:true,
			};
			self.db
				.changes(opts)
				.on('change', function(e) {
					//if(e.deleted) return;
					console.log(eventType[0] + ' change');
					Object
						.values(eventType[1])
						.forEach(function(handler){
							setTimeout(handler,20,e);
						});
					if(e.seq % 10 === 0){
						self.db.compact();
					}
				});
		});


		this.addEventListener('results',async function(e){
			if(e.deleted){
				console.log("removed result: " + e.id);
			}
			else{
				let result = await self.Compare(e.doc);
				self.db.upsert('result.'+result.name,function(oldDoc){
					if(utils.docsEqual(result,oldDoc)){
						return false;
					}
					return result;
				});
			}
		});

		this.addEventListener('submissions',async function(e){
			if(e.deleted){
				let results = await self.db.allDocs({startkey:'result.',endkey:'result.\ufff0'});
				let submission = e.id.split('.').pop();
				let deletes = results.rows.map(function(d){
					let keys = d.id.split('.');
					keys.shift();
					let match = keys.some(function(name){
						let m = name === submission;
						return m;
					});
					if(!match){
						return false;
					}
					return self.db.upsert(d.id,()=>({_deleted:true}));
				});
				Promise.all(deletes);
			}
			else{
				//let results = await self.Submissions;
				let results = await self.db.allDocs({startkey:'submission.',endkey:'submission.\ufff0', include_docs:true});
				results = results.rows
					.filter((d)=>{
						return d.id !== e.id;
					})
					.map(d=>{
						let result = AlgorithmResults.Create(e.doc,d.doc)
							.then(function(result){
								let newDoc = AlgorithmResults.toJSON(result);
								let upsert = self.db.upsert('result.'+result.name,function(oldDoc){
										if(oldDoc.hash === newDoc.hash){
											return false;
										}

										return newDoc;
									});
								return upsert;
							});
						return result;
					})
					;
				Promise.all(results);
			}
		});
	}

	removeEventListener(type,handler){
		if(!(type in this._events)){
			throw Error('Unknown event type');
		}
		let handlers = this._events[type];
		if(typeof handler === 'function'){
			handler = handler.name;
		}
		if(typeof handler === 'string'){
			if(handler in handlers){
				delete handlers[handler];
			}
		}
	}

	addEventListener(type,handler){
		if(!(type in this._events)){
			throw Error('Unknown event type');
		}
		let name = handler.name;
		if(name === ''){
			name = handler.toString();
		}
		this._events[type][name] = handler;
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
		return this.db.query('checksims/submissions',{
				include_docs: true
			})
			.then(function(results){
				let rows = results.rows.map(d=>{
					let sub = d.doc;
					sub =  Submission.fromJSON(sub);
					return sub;
				});
				return rows;
			})
			;
	}

	/**
	 * @return Set of submissions to run on
	 */
	get Results() {
		return this.db.query('checksims/results',{
				include_docs: true
			})
			.then(function(results){
				let rows = results.rows.map(d=>{
					let sub = d.doc;
					return sub;
				})
				.filter(d=>{
					let valid = (!d) === false;
					return valid;
				});
				return rows;
			})
			;
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
			let newDoc = await newSub.toJSON();
			this.db.upsert('submission.'+newSub.name,function(oldDoc){
				newDoc = JSON.parse(newDoc);
				if(utils.docsEqual(newDoc,oldDoc)){
					return false;
				}
				return newDoc;
			});
		}
	}


	/**
	 * @param newSubmissions New set of submissions to work on. Must contain at least 1 submission.
	 * @return This configuration
	 */
	addResults(newResult) {
		utils.checkNotNull(newResult);
		if(!Array.isArray(newResult)){
			newResult = [newResult];
		}

		newResult.forEach((result)=>{
			this.db.upsert('result.'+result.name,function(oldDoc){
				if(oldDoc.complete === oldDoc.totalTokens){
					return false;
				}
				if(utils.docsEqual(result,oldDoc)){
					return false;
				}
				return result;
			});
		});
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
	 * @return Current version of DeepDiff
	 */
	static get Version(){
		return "0.1.0";
	}

	async Compare(pair, force = false){
		if(!force && pair.complete === pair.totalTokens){
			return pair;
		}

		if(pair.submissions[0].finalList.length === 0){
			let common = await this.CommonCode;
			common = CommonCodeLineRemovalPreprocessor(common);
			let tokens = pair.submissions.map(function(submission){
				return 'submission.'+submission.submission;
			});
			tokens = await this.db
				.allDocs({keys:tokens,include_docs:true})
				.then(subs=>{
					return subs.rows.map(s=>{
						s = s.doc;
						s = Submission.fromJSON(s);
						s.Common = common;

						s = s.ContentAsTokens;
						return s;
					});
				});
			tokens = await Promise.all(tokens);
			pair.submissions[0].finalList = tokens[0];
			pair.submissions[1].finalList = tokens[1];
		}
		let algo = this.Algorithm;
		console.log("Performing comparison on " + pair.name );
		let result = await algo(pair,async (comparer)=>{
			pair.submissions.forEach((orig,i)=>{
				let sub = comparer.submissions[i];
				sub = Array.from(sub);
				orig.identicalTokens = sub.filter(t=>t.shared).length;
				orig.percentMatched = orig.identicalTokens / orig.totalTokens;
			});
			pair.complete = (comparer.totalSize - comparer.remaining) -1;
			pair.totalTokens = comparer.totalSize;
			pair.identicalTokens = comparer.tokenMatch;
			pair.percentMatched = pair.identicalTokens / pair.totalTokens;
			//this.addResults(pair);

		});
		result = AlgorithmResults.toJSON(result);
		this.addResults(result);
		return result;
	}

	/**
	 * .
	 *
	 * @param config Configuration defining how DeepDiff will be run
	 * @return Map containing output of all output printers requested. Keys are name of output printer.
	 * @throws DeepDiffException Thrown on error performing similarity detection
	 */
	async runAllCompares(){
		// Perform parallel analysis of all submission pairs to generate a results list
		let allPairs = await this.Results;
		if(allPairs.length === 0){
			return Promise.resolve();
		}

		let results = allPairs
			.filter((pair)=>{
				if (!pair) return false;
				if (pair.complete === pair.totalTokens) return false;
				return true;
			})
			;

		console.log("Discovered " + results.length + " oustanding pairs");
		// Turns out it's better to do them sequentially
		//results = await Promise.all(results);
		for(let i=results.length-1; i>=0; i--){
			this.Compare(results[i]);
		}
	}

}
