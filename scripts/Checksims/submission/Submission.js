'use strict';
export{
	Submission
};

/*
global JSZip
*/

import '../token/tokenizer/LineTokenizer.js';
import '../token/tokenizer/CharTokenizer.js';
import '../token/tokenizer/WhitespaceTokenizer.js';
import {ContentHandlers} from '../submission/ContentHandlers.js';
import {PreprocessorRegistry} from '../preprocessor/PreprocessorRegistry.js';
import {TokenList} from '../token/TokenList.js';
import {TokenizerRegistry} from '../token/TokenizerRegistry.js';
import {checkNotNull, checkArgument, hasher} from '../util/misc.js';


/**
 * Interface for Submissions.
 *
 * Submissions are considered Comparable so they can be ordered for
 * output. Generally, we only expect that their names, and not their
 * contents, will be compared.
 *
 * Also contains factory methods for submissions
 */
export default class Submission {

	/**
	 * Construct a new Concrete Submission with given name and contents.
	 *
	 * Token content should be the result of tokenizing the string
	 * content of the submission with some tokenizer. This invariant is
	 * maintained throughout the project, but not enforced here for
	 * performance reasons. It is thus possible to create a
	 * ConcreteSubmission with Token contents not equal to tokenized
	 * String contents. This is not recommended and will most likely
	 * break, at the very least, Preprocessors.
	 */
	constructor(name, files) {
		this.common = PreprocessorRegistry.processors.null;

		if(name instanceof Submission){
			this.allContent = name.allContent;
			this.content = name.content;
			this.name = name.name;
			this.typedContent = name.typedContent;

			return;
		}
		checkNotNull(name);
		checkArgument(typeof name === 'string','name expected to be string');
		checkArgument(name !== '', "Submission name cannot be empty");
		checkNotNull(files);
		checkArgument(typeof files === 'object','Expecting a list of promised files');

		// Group the files by the various types we handle
		let content = Object.entries(files)
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
				let handler = ContentHandlers.handlers.filter(function(d){
					let match = d.ext.some(function(e){
							let match = ext === e;
							return match;
						});
					return match;
				}).shift();
				if(!handler){
					handler = ContentHandlers.defaultHandler;
				}
				if(!agg[handler.type]){
					agg[handler.type] = {files:{}};
				}
				agg[handler.type].files[name] = content;
				return agg;
			},{})
			;
		// now that they are grouped, create a promise to join them
		// all together into a single block of content
		let allContent = [];
		Object.values(content).forEach(function(d){
			let c = Object.entries(d.files)
				.sort((entry)=>{return entry[0];})
				.map((entry)=>{return entry[1];})
				;
			d.content = Promise.all(c)
				.then(function(content){
					content = content.join('\n');
					return content;
				});
			allContent.push(d.content);
		});

		this.allContent = allContent;
		this.typedContent = content;
		this.content = files;
		this.name = name;
	}

	set Common(common){
		this.common = common;
	}

	get Common(){
		return this.common;
	}


	get ContentAsTokens() {
		if(!('_tokenList' in this)){
			let self = this;
			let tokenlists = {};
			Object.entries(this.typedContent).forEach(function(d){
				let handler = ContentHandlers.handlers[d[0]];
				let type = handler.tokenizer;
				let preprocessors = handler.preprocessors.map(function(p){
						let proc = PreprocessorRegistry.processors[p];
						return proc;
					})
					;
				preprocessors.unshift(self.Common);
				let tokenizer = TokenizerRegistry.processors[type];
				let content = d[1];
				content = Object.values(content.files);
				tokenlists[type] = Promise.all(content)
					.then(function(contentString){
						contentString = contentString.join('\n');
						return (async function(){
							let cString = contentString;
							for(let p=0; p<preprocessors.length; p++){
								let processor = preprocessors[p];
								cString = await processor(cString);
							}
							return cString;
						})();
					})
					.then(function(contentString){
						let tokens = tokenizer.split(contentString);
						if(tokens.length > 7500) {
							console.warn("Warning: Submission " + self.name + " has very large token count (" + tokens.length + ")");
						}
						return tokens;
					});
			});
			tokenlists = Object.values(tokenlists);
			this._tokenList = Promise.all(tokenlists)
				.then(function(tokens){
					let tokenlist = new TokenList('mixed',[]);
					tokens.forEach(function(t){
						t.forEach(function(d){
							tokenlist.push(d);
						});
					});
					return tokenlist;
				});

		}
		return this._tokenList;
	}

	get ContentAsString() {
		if(!('_content' in this)){
			let self = this;
			this._content = Promise.all(self.allContent)
				.then(function(fileContent){
					let contentString = fileContent.join('\n');
					return contentString;
				})
				;
		}
		return this._content;
	}

	get Name(){
		return this.name;
	}

	get hash(){
		if(!('_hash' in this)){
			let self = this;
			this._hash= new Promise(function(r){
					let content = self.content;
					r(content);
				})
				.then(function(content){
					//let name = self.name;
					//let hash = hasher(name + content);
					let hash = hasher(content);
					return hash;
				});
		}
		return this._hash;
	}

	get totalTokens(){
		return this.ContentAsTokens.then(function(tokens){return tokens.length;});
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

	async toJSON() {
		let json = {
			type : 'Submission',
			name : this.name,
			content : {},
			hash : await this.hash,
			totalTokens : await this.totalTokens,
		};
		for(let key in this.content){
			json.content[key] = await this.content[key];
		}
		return JSON.stringify(json);
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
		let sub = new Submission(json.name, json.content);
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
