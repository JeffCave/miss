'use strict';
export {
	DeepDiff
};

import "https://cdnjs.cloudflare.com/ajax/libs/pouchdb/7.0.0/pouchdb.min.js";
import "./lib/pouchdb.upsert.min.js";
import "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.9.1/underscore-min.js";

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
global _
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

		this._ = {
			config:{}
		};

		this.numThreads = 1;
		this.report = {
			results:{},
			submissions:{},
			archives:[],
		};

		this._.emit = {
			load : ()=>{
				this.dispatchEvent(new Event('load'));
			}
		};

		this.dbLoad();

	}


	get db(){
		if(this._.db){
			return this._.db;
		}
		this._.db = new PouchDB('DeepDiff');
		return this._.db;
	}

	async dbLoad(){
		await this.dbInit();
		this._.config = await this.db
			.get('config')
			.catch((e)=>{
				if(e.status !== 404){
					console.error('ERROR loading DeepDiff configuration.');
				}
				return {};
			})
			;
		let submissions = await this.Submissions;
		this.report.submissions = submissions;
		let results = await this.Results;
		this.report.results = results.reduce((a,d)=>{
			a[d.name] = d;
			return a;
		},{});
		this._.emit.load();
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
					this.dispatchEvent(new CustomEvent('change',{ detail: e }));
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
						let isMatch = (d.id === e.detail.id);
						return !isMatch;
					})
					.map(d=>{
						AlgorithmResults.Create(e.detail.doc,d.doc).then(result=>{
							this.Refresh(result);
						})
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
		if(!this._.algorithm){
			this.Algorithm = AlgorithmRegistry.def;
		}
		return this._.algorithm;
	}
	/**
	 * @param newAlgorithm New similarity detection algorithm to use
	 * @return This configuration
	 */
	set Algorithm(newAlgorithm) {
		if(typeof newAlgorithm === 'string'){
			this._.config.algorithm = newAlgorithm;
			this._.algorithm = AlgorithmRegistry.processors[this._.config.algorithm];
		}
		this.SaveConfig();
	}


	get AlgorithmRegistry(){
		return AlgorithmRegistry.processors;
	}

	get Title(){
		let title = this._.config.title;
		if(!title){
			title = new Date();
			title = title.toISOString().replace(/[^0-9]/g,'').substr(0,12);
			title = 'MISS-' + title;
			this.Title = title;
		}
		return this._.config.title;
	}
	set Title(value){
		if(this._.config.title === value){
			return;
		}
		if(typeof value !== 'string'){
			throw new Error('Invalid datatype. Expected String, receive "'+(typeof value)+'" ('+value.toString()+')');
		}
		value = value.toString();
		this._.config.title = value;
		this.SaveConfig();
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

	async Refresh(key,force=false){
		if(typeof key === 'boolean'){
			force = key;
			key = null;
		}
		force = force === true;

		let results = Object.values(this.report.results);
		if(typeof key === 'string'){
			key = this.report.results[key];
		}
		if(key && typeof key === 'object'){
			results = [key];
		}
		let newResults = [];
		for(let result of results){
			result = await AlgorithmResults.Create(result.submissions[0],result.submissions[1]);
			let newDoc = AlgorithmResults.toJSON(result);
			let upsert = await this.db.upsert('result.'+result.name,(oldDoc)=>{
				if(force){
					return newDoc;
				}
				if(oldDoc.hash === newDoc.hash){
					return false;
				}
				return newDoc;
			});
			if(upsert.updated){
				newResults.push(upsert.id);
			}
		}
		return newResults;
	}

	async Clear(){
		console.log('Deleting database...');
		await this.db.destroy();
		this._.db = null;
		console.log('Database deleted.');
		await this.dbLoad();
		this._.emit.load();
	}

	async Save(){
		console.warn("DEPCRECATED: use 'export' instead");
		return this.Export();
	}
	async Export(){
		let docs = await this.db.allDocs({
			startkey: '_\ufff0',
			endkey: '\ufff0',
			include_docs: true
		});
		docs = docs.rows.map((row)=>{
			row = row.doc;
			delete row._rev;
			return row;
		});
		console.log('Read database');
		return docs;
	}

	async Load(json){
		console.warn("DEPCRECATED: use 'Import' instead");
		return this.Import(json);
	}
	async Import(json){
		await this.Clear();
		await this.db.bulkDocs(json);
		await this.dbLoad();
		console.log('Loaded from file');
	}


	/**
	 * @param newSubmissions New set of submissions to work on. Must contain at least 1 submission.
	 * @return This configuration
	 */
	async addSubmissions(newSubmissions) {
		if(newSubmissions instanceof Submission){
			newSubmissions = [newSubmissions];
		}
		if(!Array.isArray(newSubmissions)){
			newSubmissions = Submission.submissionsFromFiles(newSubmissions, this.Filter);
		}
		let puts = [];
		for(let d=0; d<newSubmissions.length; d++){
			let newSub = newSubmissions[d];
			let newDoc = newSub.toJSON();
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

	removeSubmission(id){
		if(id instanceof Submission){
			id = id.name;
		}
		id = ['submission',id].join('.');
		this.db.upsert(id,function(){
			return {_deleted:true};
		});
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

	get SaveConfig(){
		if(this._.configsaver){
			return this._.configsaver;
		}

		let configsaver = async ()=>{
			let save = this.db.upsert('config',(oldDoc)=>{
				let newDoc = this._.config;
				if(utils.docsEqual(oldDoc,newDoc)){
					return false;
				}
				return newDoc;
			});
			save = await save;
			return save;
		};
		configsaver = _.debounce(configsaver,1000);

		this._.configsaver = configsaver;
		return this._.configsaver;
	}

	async Compare(pair, force = false){
		if(!force && pair.complete === pair.totalTokens){
			return pair;
		}

		if(pair.submissions[0].finalList.length === 0){
			let tokens = pair.submissions.map(function(submission){
				return 'submission.'+submission.submission;
			});
			let subs = await this.db.allDocs({keys:tokens,include_docs:true});
			tokens = subs.rows
				.filter(s=>{
					return s.doc;
				})
				.map(s=>{
					s = s.doc;
					s = Submission.fromJSON(s);
					s = s.tokens;
					return s;
				});

			if(tokens.length < 2){
				let result = await AlgorithmResults.Create(pair.submissions[0], pair.submissions[1], [], [], {error:'Invalid Token Length'});
				result.totalTokens = 0;
				this.addResults(result);
				return result;
			}

			pair.submissions[0].finalList = tokens[0];
			pair.submissions[1].finalList = tokens[1];
		}
		let algo = this.Algorithm.proc;
		console.log("Performing comparison on " + pair.name );
		let timer = performance.now();
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
		timer = performance.now() - timer;
		if(result){
			result = AlgorithmResults.toJSON(result);
			this.addResults(result);
			let size = result.submissions.reduce((a,r)=>{return a*r.totalTokens;},1);
			size /= 1024**2;
			this.ga('send', {
				hitType: 'timing',
				timingCategory: 'DeepDiff',
				timingVar: 'compare-ms/mb',
				timingValue: timer/size,
			});
			this.ga('send', {
				hitType: 'timing',
				timingCategory: 'DeepDiff',
				timingVar: 'compare',
				timingValue: timer,
			});
			this.ga('send', {
				hitType: 'event',
				eventCategory: 'DeepDiff',
				eventAction: 'compare-size',
				eventLabel: 'result.anonymous',
				eventValue: size
			});
			/*
			// TODO: Issue #35
			// It's tempting to report this. However, this strays into
			// gathering personal data (not by much, but a little). Given
			// the hostility, and legal risks faced by users, we should
			// probably ask permission (checkbox?) prior to transmitting
			// this.
			this.ga('send', {
				hitType: 'event',
				eventCategory: 'DeepDiff',
				eventAction: 'compare-similarity',
				eventLabel: 'result.anonymous',
				eventValue: result.percentMatched * 1000
			});
			*/
		}
		return result;
	}

	/**
	 *
	 */
	async runAllCompares(){
		if(this.runAllComparesIsRunning) return;

		this.runAllComparesIsRunning = true;
		let allPairs = await this.Results;

		let results = allPairs
			.filter((pair)=>{
				// if its null for some reason
				if (!pair) return false;
				// if it has already been processed
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
			return;
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
		setTimeout(()=>{this.runAllCompares();});
	}

	get ga(){
		return window.ga || (()=>{});
	}


}
