'use strict';
export{
	Submission
};

import {LineTokenizer} from '../token/tokenizer/LineTokenizer.js';
import {TokenList} from '../token/TokenList.js';
import {ContentHandlers} from '../submission/ContentHandlers.js';
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
	constructor(name, files, tokens = null) {
		if(name instanceof Submission){
			this.content = name.content;
			this.name = name.name;
			return;
		}
		checkNotNull(name);
		checkArgument(typeof name === 'string','name expected to be string');
		checkArgument(name !== '', "Submission name cannot be empty");
		checkNotNull(files);
		checkArgument(typeof files === 'object','Expecting a list of promised files');
		if(tokens !== null){
			checkArgument(Array.isArray(tokens),'tokens expected to be an array');
		}


		// Group the files by the various types we handle
		let content = Object.entries(files)
			.filter(function(d){
				let ext = d[0].split('.').pop();
				let ignore = ContentHandlers.ignores.every(function(e){
						return ext !== e;
					});
				return ignore;
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

		this.content = allContent;
		this.name = name;
	}


	get ContentAsTokens() {
		if(!('_tokenList' in this)){
			let tokenizer = LineTokenizer.getInstance();
			let self = this;
			this._tokenList = this.ContentAsString
				.then(function(contentString){
					let tokens = tokenizer.splitString(contentString);
					if(tokens.length > 7500) {
						console.warn("Warning: Submission " + self.name + " has very large token count (" + tokens.length + ")");
					}
					return tokens;
				})
				;
		}
		return this._tokenList;
	}

	get ContentAsString() {
		if(!('_content' in this)){
			let self = this;
			this._content = Promise.all(self.content)
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
					let name = self.name;
					let hash = hasher(name + content);
					return hash;
				});
		}
		return this._hash;
	}

	toString() {
		let json = {
			type : 'Submission',
			name : this.name,
			content : this.content,
			hash : this.hashCode
		};
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
		let sub = new Submission(json.name, json.content, new TokenList(json.content));
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
				'NullContent':new Promise((result)=>{
					result('');
				})
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

	static async submissionsFromFiles(files,glob){
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

		submissions = Promise.all(submissions)
			.then(function(submissions){
				submissions = submissions.filter(function(s){
					return s;
				});
				return submissions;
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
	static async submissionFromFiles(name, files){
		checkNotNull(name);
		checkArgument(name.length, "Submission name cannot be empty");
		checkNotNull(files);

		let submission = new Submission(name, files);
		return submission;
	}


}
