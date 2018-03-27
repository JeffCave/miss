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

/*
global loader
global TokenList
global TokenType
global checkNotNull, checkArgument, hashCode
*/
loader.load([
	,'/scripts/token/TokenList.js'
	,'/scripts/token/TokenType.js'
	,'/scripts/util/misc.js'
]);

/**
 * Interface for Submissions.
 *
 * Submissions are considered Comparable so they can be ordered for
 * output. Generally, we only expect that their names, and not their
 * contents, will be compared.
 *
 * Also contains factory methods for submissions
 */
class Submission {

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
	 *
	 * @param name Name of new submission
	 * @param content Content of submission, as string
	 * @param tokens Content of submission, as token
	 */
	constructor(name, content, tokens) {
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
			checkNotNull(tokens);
			checkArgument(tokens instanceof Array,'tokens expected to be an array');
		}

		if(!(tokens instanceof TokenList)){
			tokens = new TokenList(TokenType.CHARACTER,tokens);
		}

		this.name = name;
		this.content = content;
		this.tokenList = TokenList.immutableCopy(tokens);
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
	 */
	static submissionsFromZip(submissionDirs, glob, tokenizer, recursive, retainEmpty){
		if(submissionDirs === null){
			return [];
		}
		checkNotNull(submissionDirs);
		checkArgument(Object.keys(submissionDirs.files).length > 0, "Must provide at least one submission directory!");
		checkNotNull(glob);
		checkNotNull(tokenizer);

		// Divide entries by student
		let studentSubs = {};
		submissionDirs.forEach(function(name,entry){
			let key = name.split('/');
			key.shift();
			let student = key.shift();
			if(!entry.dir){
				if(!(student in studentSubs)){
					studentSubs[student] = [];
				}
				studentSubs[student].push(entry);
			}
		});

		// Generate submissions to work on
		let submissions = Object.entries(studentSubs).map(function(entry){
			let student = entry[0];
			let files = entry[1].filter(function(f){
					let result = glob.test(f.name);
					return result;
				});
			console.debug("Adding student: " + student);
			let submission = Submission.submissionFromFiles(student, files, tokenizer);
			return submission;
		});

		submissions = Promise.all(submissions)
			.then(function(submissions){
				submissions = submissions.filter(function(s){
					if(!retainEmpty) {
						if(s.getContentAsString() === '') {
							console.warn("Discarding empty submission " + s.getName());
						}
						else {
							return s;
						}
					}
					else{
						return s;
					}
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
	 *
	 * @param name Name of the new submission
	 * @param files List of files to include in submission
	 * @param splitter Tokenizer for files in the submission
	 * @return A new submission formed from the contents of all given files, appended and tokenized
	 * @throws IOException Thrown on error reading from file
	 * @throws NoMatchingFilesException Thrown if no files are given
	 */
	static async submissionFromFiles(name, files, splitter){
		checkNotNull(name);
		checkArgument(name.length, "Submission name cannot be empty");
		checkNotNull(files);
		checkArgument(Array.isArray(files), "Submission files must be an array");
		checkNotNull(splitter);

		if(files.length === 0) {
			throw new Error("No matching files found, cannot create submission named '" + name + "'");
		}

		// To ensure submission generation is deterministic, sort files by name, and read them in that order
		let orderedFiles = files.sort(function(file1, file2){
			return file1.name.localeCompare(file2.name);
		});

		let tokenList = new TokenList(splitter.getType());

		// Could do this with a .stream().forEach(...) but we'd have to handle the IOException inside
		let fileContent = await Promise.all(orderedFiles
			.map(function(f) {
					return f.async("string")
						.then(function (data) {
							let content = data;
							if(!content.endsWith("\n") && content != '') {
								content += "\n";
							}
							return content;
						});
			}));

		let contentString = fileContent.join('\n');

		// Split the content
		let tokens = splitter.splitString(contentString);
		tokenList = tokenList.concat(tokens);

		if(tokenList.length > 7500) {
			console.warn("Warning: Submission " + name + " has very large token count (" + tokenList.size() + ")");
		}

		let submission = new Submission(name, contentString, tokenList);
		return submission;
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
			Submission._NullSubmission = new Submission(' ','',new TokenList(TokenType.CHARACTER,));
		}
		return Submission._NullSubmission;
	}



	getContentAsTokens() {
		return this.tokenList;
	}

	getContentAsString() {
		return this.content;
	}

	getName() {
		return this.name;
	}

	getNumTokens() {
		return this.tokenList.size();
	}

	getTokenType() {
		return this.tokenList.type;
	}

	toString() {
		return "A submission with name " + this.name + " and " + this.getNumTokens() + " tokens";
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
	 * Compare two Submissions, using natural ordering by name.
	 *
	 * Note that the natural ordering of ConcreteSubmission is
	 * inconsistent with equality. Ordering is based solely on the name
	 * of a submission; two submissions with the same name, but different
	 * contents, will have compareTo() return 0, but equals() return false
	 *
	 * @param other Submission to compare to
	 * @return Integer indicating relative ordering of the submissions
	 */
	compareTo(other) {
		return this.name.compareTo(other.getName());
	}
}
