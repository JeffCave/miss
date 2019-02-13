'use strict';
export {
	DeepDiff
};

import "https://cdnjs.cloudflare.com/ajax/libs/pouchdb/6.4.3/pouchdb.min.js";
import "./lib/pouchdb.upsert.min.js";

import './algorithm/smithwaterman/SmithWaterman.js';
import './preprocessor/LowercasePreprocessor.js';
import './preprocessor/WhitespaceDeduplicationPreprocessor.js';
import {AlgorithmRegistry} from './algorithm/AlgorithmRegistry.js';
import * as AlgorithmResults from './algorithm/AlgorithmResults.js';
import {CommonCodeLineRemovalPreprocessor} from './preprocessor/CommonCodeLineRemovalPreprocessor.js';
import {ContentHandlers} from './submission/ContentHandlers.js';
import {Submission} from './submission/Submission.js';

import * as utils from './util/misc.js';

/*
global CustomEvent
global emit
global Event
global PouchDB
global EventTarget
*/

/**
 * CLI Entry point and main public API endpoint for DeepDiff.
 */
export default class DeepDiff extends EventTarget{

	constructor() {
		super();

		this.numThreads = 1;
		this.db = new PouchDB('DeepDiff');
		this.report = {
			results:{},
			submissions:{},
			archives:[],
		};

		(async ()=>{
			await this.dbInit();
			let submission = await this.Submissions;
			this.report.submissions = submission.reduce((a,d)=>{
				d.tokens = Object.entries(d.content).reduce((a,d)=>{
					let key = d[0];
					let content = d[1];
					let ext = key.split('.').pop();
					let handler = ContentHandlers.lookupHandlerByExt(ext);
					a[key] = handler.tokenizer.split(content.blob,key);
					return a;
				},{});
				a[d.name] = d;
				return a;
			},{});
			let results = await this.Results;
			this.report.results = results.reduce((a,d)=>{
				a[d.name] = d;
				return a;
			},{});
			this.dispatchEvent(new Event('load'));
		})();
	}

	async dbInit(){
		let designdoc = this.db.upsert('_design/checksims',(doc)=>{
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
		designdoc = await designdoc;
		this.runAllCompares();
		//let events =
		['submissions','results'].map(async (eventType)=>{
			let opts = ['checksims',eventType].join('/');
			opts = {
				filter:opts,
				since:'now',
				live:true,
				include_docs:true,
			};
			this.db
				.changes(opts)
				.on('change', (e)=>{
					//if(e.deleted) return;
					console.log(eventType + ' change');
					this.dispatchEvent(new CustomEvent(eventType,{ detail: e }));
					if(e.seq % 1000 === 0){
						this.db.compact();
					}
				})
				;
		});
		//events = await Promise.all(events);

		this.addEventListener('results',async (e)=>{
			this._significantSimilarity = null;
			if(e.detail.deleted){
				let id = e.detail.id.split('.');
				id.shift();
				id = id.join('.');
				delete this.report.results[id];
				this.Algorithm({name:id,action:'stop'});
				console.log("removed result: " + e.detail.id);
			}
			else{
				let summary = JSON.parse(JSON.stringify(e.detail.doc));
				summary.submissions.forEach((d)=>{
					delete d.finalList;
				});
				this.report.results[e.detail.doc.name] = summary;

				this.runAllCompares();
			}
		});

		this.addEventListener('submissions',async (e)=>{
			if(e.detail.deleted){
				let id = e.detail.id.split('.');
				id.shift();
				id = id.join('.');
				delete this.report.submissions[id];

				let results = await this.db.allDocs({startkey:'result.',endkey:'result.\ufff0',include_docs:true});
				let deletes = results.rows
					.map((d)=>{
						let match = d.doc.submissions.some((s)=>{
							return s.name === id;
						});
						if(!match){
							return false;
						}
						return this.db.upsert(d.id,()=>({_deleted:true}));
					})
					.filter(d=>{
						return d !== false;
					})
					;
				deletes = await Promise.all(deletes);
				return deletes;
			}
			else{
				let summary = JSON.parse(JSON.stringify(e.detail.doc));
				delete summary.content;
				this.report.submissions[e.detail.doc.name] = summary;

				//let results = await self.Submissions;
				let results = await this.db.allDocs({startkey:'submission.',endkey:'submission.\ufff0', include_docs:true});
				results = results.rows
					.filter((d)=>{
						return d.id !== e.id;
					})
					.map(d=>{
						let result = AlgorithmResults.Create(e.detail.doc,d.doc)
							.then((result)=>{
								let newDoc = AlgorithmResults.toJSON(result);
								let upsert = this.db.upsert('result.'+result.name,(oldDoc)=>{
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
				results = await Promise.all(results);
				return results;
			}
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
		if(!this.algorithm){
			this.algorithm = AlgorithmRegistry.def;
			this.algorithm = AlgorithmRegistry.processors[this.algorithm];
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
		return AlgorithmRegistry.processors;
	}

	/**
	 * @return Set of submissions to run on
	 */
	get Submissions() {
		let subs = this.db.query('checksims/submissions',{
				include_docs: true
			})
			.then(function(results){
				let rows = results.rows.map(async (d)=>{
					let sub = d.doc;
					sub = await Submission.fromJSON(sub);
					return sub;
				});
				rows = Promise.all(rows);
				return rows;
			})
			;
		return subs;
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
		let puts = [];
		for(let d=0; d<newSubmissions.length; d++){
			let newSub = newSubmissions[d];
			let newDoc = await newSub.toJSON();
			let put = this.db.upsert('submission.'+newSub.name,function(oldDoc){
				if(utils.docsEqual(newDoc,oldDoc)){
					return false;
				}
				return newDoc;
			});
			puts.push(put);
		}
		puts = await Promise.all(puts);
		return puts;
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
	 * Compares the result against the perceived "significant" value;
	 *
	 */
	isSignificantResult(result){
		let significant = this.significantSimilarity;
		significant = (significant <= result.percentMatched);
		return significant;
	}

	/**
	 * Returns the percent similarity that appears signficant
	 *
	 * "Significant" is a relative term, and by "relative" I mean relative to
	 * the rest of the assignments. What we need to watch for is a big change
	 * in differences.
	 */
	get significantSimilarity(){
		if(this._significantSimilarity){
			return this._significantSimilarity;
		}
		let last = null;
		let diffs = Object.values(this.report.results)
			.filter(r=>{
				return r.complete === r.totalTokens;
			})
			.sort((a,b)=>{
				return a.percentMatched - b.percentMatched;
			})
			.map((r)=>{
				if(last === null){
					last = r;
				}
				let rtn = {
					diff : r.percentMatched - last.percentMatched,
					pct : r.percentMatched
				};
				last = r;
				return rtn;
			})
			.filter(r=>{ return r; })
			;
		// put a dummy value in to handle empty arrays
		diffs.push({diff:Number.MIN_VALUE});
		// pick the largest value from the array
		let max = diffs.reduce((a,d)=>{
				if(a.diff < d.diff){
					return d;
				}
				return a;
			},diffs[0]);
		// if the biggest difference is really small, set the value such that
		// nothing is considered significant (make the significant value
		// arbitrarily larger than any of the values)
		if(max.diff < 0.1){
			max.pct = 2;
		}
		this._significantSimilarity = max.pct;
		return this._significantSimilarity;
	}


	/**
	 * Get current version.
	 *
	 * @return Current version of DeepDiff
	 */
	static get Version(){
		return "0.2.0";
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
					return subs.rows
						.filter(s=>{
							return s.doc;
						})
						.map(async s=>{
							s = s.doc;
							s = await Submission.fromJSON(s);
							s.Common = common;

							s = await s.ContentAsTokens;
							return s;
						});
				});
			tokens = await Promise.all(tokens);

			if(tokens.length < 2){
				let result = await AlgorithmResults.Create(pair.submissions[0], pair.submissions[1], [], [], {error:'Invalid Token Length'});
				result.totalTokens = 0;
				this.addResults(result);
				return result;
			}

			pair.submissions[0].finalList = tokens[0];
			pair.submissions[1].finalList = tokens[1];
		}
		let algo = this.Algorithm;
		console.log("Performing comparison on " + pair.name );
		let result = await algo(pair,async (comparer)=>{
			comparer = comparer.data;
			let result = this.report.results[comparer.name];
			if(!result) return;
			//result.complete = (comparer.totalSize - comparer.remaining) -1;
			//result.totalTokens = comparer.totalSize;
			//result.identicalTokens = comparer.tokenMatch;
			//result.percentMatched = result.identicalTokens / result.totalTokens;
			let completePct = (comparer.totalSize - comparer.remaining) -1;
			completePct = completePct / comparer.totalSize;
			result.percentMatched = completePct;
			result.submissions.forEach((orig,i)=>{
				//let sub = comparer.submissions[i];
				//sub = Array.from(sub);
				//orig.identicalTokens = sub.filter(t=>t.shared).length;
				//orig.percentMatched = orig.identicalTokens / orig.totalTokens;
				orig.percentMatched = completePct;
			});
			//this.addResults(pair);
		});
		if(result){
			result = AlgorithmResults.toJSON(result);
			this.addResults(result);
		}
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
		if(!this.runAllComparesIsRunning){
			this.runAllComparesIsRunning = true;
			let allPairs = await this.Results;

			let results = allPairs
				.filter((pair)=>{
					if (!pair) return false;
					if (pair.complete === pair.totalTokens) return false;
					return true;
				})
				.sort((a,b)=>{
					let compare = 0;
					let compareSizeA = 0;
					let compareSizeB = 0;

					// put the ones that have the nearest number of tokens first
					// ones that look similar?
					compareSizeA = Math.abs(a.submissions[0].totalTokens - a.submissions[1].totalTokens);
					compareSizeB = Math.abs(b.submissions[0].totalTokens - b.submissions[1].totalTokens);
					compare = compareSizeB - compareSizeA;
					if(compare !== 0){
						return compare;
					}

					// if its the same, do the smaller of the two
					compareSizeA = a.submissions[0].totalTokens * a.submissions[1].totalTokens;
					compareSizeB = b.submissions[0].totalTokens * b.submissions[1].totalTokens;
					compare = compareSizeB - compareSizeA;
					if(compare !== 0){
						return compare;
					}

					// at this point I don't care
					return 0;
				})
				;

			if(results.length === 0){
				this.runAllComparesIsRunning = false;
				return Promise.resolve();
			}
			console.log("Discovered " + results.length + " oustanding pairs");
			// Turns out it's better to do them sequentially
			//results = await Promise.all(results);
			// Try #2
			//for(let i=results.length-1; i>=0; i--){
			//	let result = await this.Compare(results[i]);
			//	console.log('Finished ' + result.name);
			//}
			// Try #3
			let result = await this.Compare(results.pop());
			console.log('Finished ' + result.name);

			this.runAllComparesIsRunning = false;
			utils.defer(()=>{this.runAllCompares();});
		}
	}

}
