'use strict';
export{
	Submission
};

import {LineTokenizer} from '../token/tokenizer/LineTokenizer.js';
import {TokenList} from '../token/TokenList.js';
import {checkNotNull, checkArgument, hashCode} from '../util/misc.js';


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
	constructor(name, content, tokens = null) {
		if(name instanceof Submission){
			tokens = name.tokenList;
			content = name.content;
			name = name.name;
		}
		else{
			checkNotNull(name);
			checkArgument(typeof name === 'string','name expected to be string');
			checkArgument(name !== '', "Submission name cannot be empty");
			checkNotNull(content);
			checkArgument(typeof content === 'string' ,'content expected to be string');
			if(tokens !== null){
				checkArgument(Array.isArray(tokens),'tokens expected to be an array');
			}
		}

		// Split the content
		if(tokens === null){
			let tokenizer = LineTokenizer.getInstance();
			tokens = tokenizer.splitString(content);
			if(tokens.length > 7500) {
				console.warn("Warning: Submission " + name + " has very large token count (" + tokens.length + ")");
			}
		}


		this.name = name;
		this.content = content;
		this.tokenList = tokens;
	}


	getContentAsTokens() {
		console.trace('Deprecation Warning');
		return this.ContentAsTokens;
	}

	get ContentAsTokens() {
		return this.tokenList;
	}

	getContentAsString() {
		console.trace('Deprecation Warning');
		return this.ContentAsString;
	}

	get ContentAsString() {
		return this.content;
	}

	getName() {
		console.trace('Deprecation Warning');
		return this.Name;
	}

	get Name(){
		return this.name;
	}

	getNumTokens() {
		console.trace('Deprecation Warning');
		return this.NumTokens;
	}

	get NumTokens() {
		return this.tokenList.size();
	}

	getTokenType() {
		console.trace('Deprecation Warning');
		return this.TokenType;
	}

	get TokenType() {
		return this.tokenList.type;
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


	equals(other) {
		if(!(other instanceof Submission)) {
			return false;
		}

		let isEqual =
			other.getName() === this.getName()
			&& other.getNumTokens() === this.getNumTokens()
			&& other.getContentAsTokens().equals(this.tokenList)
			&& other.getContentAsString() === this.content
			;
		return isEqual;
	}


	hashCode() {
		if(!('pHash' in this)){
			this.pHash = hashCode(this.name + this.content);
		}
		return this.pHash;
	}


	/**
	 * Parses Submission from string
	 */
	static fromString(json){
		json = JSON.parse(json);
		let sub = new Submission(json.name, json.content, new TokenList(json.content));
		return sub;
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
			Submission._NullSubmission = new Submission(' ','',new TokenList(TokenList.TokenTypes.LINE));
		}
		return Submission._NullSubmission;
	}


	/**
	 * Build the collection of submissions Checksims will be run on.
	 */
	static submissionsFromZip(submissionDirs, glob){
		if(submissionDirs === null){
			return async function(){return Submission.NullSubmission;};
		}
		checkNotNull(submissionDirs);
		checkArgument(Object.keys(submissionDirs.files).length > 0, "Must provide at least one submission directory!");
		checkNotNull(glob);

		let files = {};
		submissionDirs.forEach(function(name,entry){
			if(!entry.dir){
				let key = name;
				files[key] = entry
					.async("string")
					.then(function (data) {
						let content = data;
						if(!content.endsWith("\n") && content !== '') {
							content += "\n";
						}
						return content;
					})
					;
			}
		});

		let submissions = Submission.submissionsFromFiles(files,glob);
		return submissions;
	}

	static async submissionsFromFiles(files,glob){
		if(files === null){
			return async function(){return Submission.NullSubmission;};
		}
		checkNotNull(files);
		checkArgument(Object.keys(files).length > 0, "Must provide at least one submission directory!");
		checkNotNull(glob);

		// Divide entries by student
		let studentSubs = Object.entries(files).reduce(function(agg,entries){
			let entry = entries[1];
			let key = entries[0].split('/');
			key.shift();
			let student = key.shift();
			if(glob.test(entries[0])){
				if(!(student in agg)){
					agg[student] = {};
				}
				let file = entry;
				agg[student][key] = file;
			}
			return agg;
		},{});

		// Generate submissions to work on
		let submissions = Object.entries(studentSubs).map(function(entry){
			let student = entry[0];
			let files = entry[1];
			console.debug("Adding student: " + student);
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

		// To ensure submission generation is deterministic, sort files by name, and read them in that order
		let orderedFiles = Object.keys(files)
			.sort(function(file1, file2){
				return file1.localeCompare(file2);
			})
			.map(function(name){
				return files[name];
			})
			;

		// gather up all the content
		let fileContent = await Promise.all(orderedFiles);
		let contentString = fileContent.join('\n');

		let submission = new Submission(name, contentString);
		return submission;
	}


}
