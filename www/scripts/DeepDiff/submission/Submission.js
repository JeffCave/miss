'use strict';
export{
	Submission
};

/*
global Blob
global EventTarget
global JSZip
*/

import '../token/tokenizer/LineTokenizer.js';
import '../token/tokenizer/CharTokenizer.js';
import '../token/tokenizer/WhitespaceTokenizer.js';
import '../token/tokenizer/ESTokenizer.js';
import '../token/tokenizer/PyTokenizer.js';
import {ContentHandlers} from '../submission/ContentHandlers.js';
import {PreprocessorRegistry} from '../preprocessor/PreprocessorRegistry.js';
import {TokenList} from '../token/TokenList.js';
import {checkNotNull, checkArgument, hasher} from '../util/misc.js';
import {psFile} from '../util/psFile.js';


/**
 * Interface for Submissions.
 *
 * Submissions are considered Comparable so they can be ordered for
 * output. Generally, we only expect that their names, and not their
 * contents, will be compared.
 *
 * Also contains factory methods for submissions
 */
export default class Submission extends EventTarget{

	/**
	 * Construct a new Submission with given name and contents.
	 *
	 * Token content should be the result of tokenizing the string
	 * content of the submission with some tokenizer. This invariant is
	 * maintained throughout the project, but not enforced here for
	 * performance reasons. It is thus possible to create a
	 * Submission with Token contents not equal to tokenized
	 * String contents. This is not recommended and will most likely
	 * break, at the very least, Preprocessors.
	 */
	constructor(name, files) {
		super();
		this._ = {};
		this.common = PreprocessorRegistry.processors.null;

		if(name instanceof Submission){
			this._.allContent = name.allContent;
			this.content = name.content;
			this.name = name.name;
			this._.typedContent = name.typedContent;

			return;
		}
		checkNotNull(name);
		checkArgument(typeof name === 'string','name expected to be string');
		checkArgument(name !== '', "Submission name cannot be empty");
		checkNotNull(files);
		checkArgument(typeof files === 'object','Expecting a list of promised files');

		if('' in files){
			files[name] = files[''];
			delete files[''];
		}

		this.content = files;
		this.name = name;
	}

	fetchSegment(path,start=0,finish=null){
		if((typeof path) === 'number' && (typeof finish) === 'string'){
			let tmp = path;
			path = finish;
			finish = start;
			start = tmp;
		}
		if(typeof path === 'object'){
			return this.fetchSegment(path.path,path.start,path.end);
		}
		let file = this.content[path];
		if(!file){
			return '[undefined]';
		}
		let blob = file.blob;

		start = start || 0;
		if(!finish && finish!==0){
			finish = blob.length;
		}
		finish = Math.max(finish,start);

		let segment = blob.substring(start,finish);
		return segment;
	}

	get typedContent(){
		if(this._.typedContent) return this._.typedContent;

		// Group the files by the various types we handle
		let content = Object.entries(this.content)
			.filter(function(d){
				let fname = d[0];
				let anyIgnores = ContentHandlers.ignores.some(function(e){
						let isIgnore = e.test(fname);
						return isIgnore;
					});
				return !anyIgnores;
			})
			.reduce(function(agg,file){
				let name = file[0];
				let content = file[1];
				let ext = name.split('.').pop();
				let handler = ContentHandlers.lookupHandlerByExt(ext);
				let range = {
					'path': name,
					'start': 0,
					'end': content.blob.length,
					'file': file[1],
					'type': handler.type
				};
				if(!agg[handler.type]){
					agg[handler.type] = {};
				}
				agg[handler.type][name] = range;
				return agg;
			},{})
			;
		this._.typedContent = content;
		return content;
	}

	set Common(common){
		this.common = common;
	}

	get Common(){
		return this.common;
	}

	get tokens(){
		if('tokens' in this._) return this._.tokens;
		let tokenlist = [];

		for(let type of Object.entries(this.typedContent)){
			let files=type[1];
			type = type[0];
			let handler = ContentHandlers.handlers[type]
			for(let key of Object.entries(files)){
				let segment = key[1];
				key = key[0];
				let blob = this.fetchSegment(segment);
				let tokens = handler.tokenizer.split(blob,key);
				for(let token of tokens){
					token.range[0] += segment.start;
					token.range[1] += segment.start;
				}
				tokenlist = tokenlist.concat(tokens);
			}
		}

		tokenlist = new TokenList('mixed',tokenlist);
		this._.tokens = tokenlist;
		return tokenlist;
	}

	get Name(){
		return this.name;
	}

	get hash(){
		if(this._.hash){
			return this._.hash;
		}
		let content = this.content;
		let hash = hasher(content);

		this._.hash = hash;
		return hash;
	}

	get totalTokens(){
		return this.tokens.length;
	}

	toString() {
		let json = {
			type : 'Submission',
			name : this.name,
			content : this.content,
			hash : this.hash
		};
		return JSON.stringify(json);
	}

	toJSON() {
		let json = {
			type : 'Submission',
			name : this.name,
			content : {},
			hash : this.hash,
			totalTokens : this.totalTokens,
		};
		json = JSON.parse(JSON.stringify(json));
		for(let key in this.content){
			json.content[key] = this.content[key];
		}
		if(this.visibility === false){
			json.visibility = false;
		}
		return json;
	}


	async equals(that) {
		if(!(that instanceof Submission)) {
			return false;
		}

		if(that.Name !== this.Name){
			return false;
		}

		let aContent = await this.ContentAsString;
		let bContent = await that.ContentAsString;
		if(aContent !== bContent){
			return false;
		}

		let aTokens = await this.ContentAsTokens;
		let bTokens = await that.ContentAsTokens;
		if(!aTokens.equals(bTokens)){
			return false;
		}

		return true;
	}


	/**
	 * Parses Submission from string
	 */
	static fromString(json){
		json = JSON.parse(json);
		json = Submission.fromJSON(json);
		return json;
	}

	/**
	 * Parses Submission from string
	 */
	static fromJSON(json){
		let content = {};
		if(!json) debugger;
		for(let key in json.content){
			let val = json.content[key];
			if(val instanceof Blob){
				val = new psFile(val,key);
				val = val.toJSON();
			}
			content[key] = val;
		}
		let sub = new Submission(json.name, content);
		sub._hash = json.hash;
		return sub;
	}


	clone(){
		let json = this.toString();
		json = Submission.fromString(json);
		return json;
	}


	/**
	 * A 'null' submission.
	 *
	 * This is an empty submission that can be used as a placeholder in
	 * various processes where submissions are expected but no
	 * Submissions are supplied. For example, common code will be
	 * removed from comparison. Rather than checking for Null
	 * everywhere, its just easier to have a "nothing to remove" thing.
	 */
	static get NullSubmission(){
		if(!('_NullSubmission' in Submission)){
			let content = {
				'NullContent.txt':Promise.resolve('')
			};
			Submission._NullSubmission = new Submission(' ',content);
		}
		return Submission._NullSubmission;
	}


	static async fileListFromZip(zip){
		if(zip === null){
			return {};
		}
		let names = Object.keys(zip.files);
		checkArgument(names.length > 0, "Must provide at least one submission directory!");

		let files = {};
		for(let f = 0; f < names.length; f++){
			let name = names[f];
			let file = zip.files[name];
			if(file.dir){
				continue;
			}
			if((/\.zip$/i).test(name)){
				file = await file.async('blob');
				file = await JSZip.loadAsync(file);
				file = await Submission.fileListFromZip(file);
				Object.entries(file).forEach(function(z){
					let a = name + "/" + z[0];
					let b = z[1];
					files[a] = b;
				});
			}
			else{
				files[name] = file
					.async("string")
					.then(function(file){
						if(!file.endsWith("\n") && file !== '') {
							file += "\n";
						}
						return file;
					});
			}
		}
		return files;
	}

	static submissionsFromFiles(files,glob){
		if(files === null){
			return Submission.NullSubmission;
		}
		checkNotNull(files);
		checkArgument(Object.keys(files).length > 0, "Must provide at least one submission directory!");
		checkNotNull(glob);

		// Divide entries by student
		//console.debug(glob);
		let studentSubs = Object.entries(files)
			.reduce(function(agg,keyval){
				let key = keyval[0];
				let entry = keyval[1];
				let isMatch = glob.test(key);
				//console.log(isMatch + ':' + key);
				if(isMatch){
					key = key.split('/');
					key.shift();
					let student = key.shift();
					if(!(student in agg)){
						agg[student] = {};
					}
					let file = entry;
					key = key.join('/');
					agg[student][key] = file;
				}
				return agg;
			},{});

		// Generate submissions to work on
		let submissions = Object.entries(studentSubs)
			.map(function(entry){
				let student = entry[0];
				let files = entry[1];
				//console.debug("Adding student: " + student);
				let submission = Submission.submissionFromFiles(student, files);
				return submission;
			});

		return submissions;

	}


	/**
	 * Turn a list of files and a name into a Submission.
	 *
	 * The contents of a submission are built deterministically by
	 * reading in files in alphabetical order and appending
	 * their contents.
	 */
	static submissionFromFiles(name, files){
		checkNotNull(name);
		checkArgument(name.length, "Submission name cannot be empty");
		checkNotNull(files);

		let submission = new Submission(name, files);
		return submission;
	}


}
