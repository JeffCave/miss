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

import {TokenList} from '/scripts/token/TokenList.js';
import {Minimatch} from '/scripts/util/minimatch.js'

import { checkNotNull, checkArgument, assert } from '/scripts/util/misc.js';

/**
 * Interface for Submissions.
 *
 * Submissions are considered Comparable so they can be ordered for output. Generally, we only expect that their names,
 * and not their contents, will be compared.
 *
 * Also contains factory methods for submissions
 */
export class Submission {
	/**
	 * Generate a list of all student submissions from a directory.
	 *
	 * The directory is assumed to hold a number of subdirectories, each containing one student or group's submission
	 * The student/group directories may contain subdirectories with files
	 *
	 * @param directory Directory containing student submission directories
	 * @param glob Match pattern used to identify files to include in submission
	 * @param splitter Tokenizes files to produce Token Lists for a submission
	 * @return Set of submissions including all unique nonempty submissions in the given directory
	 * @throws java.io.IOException Thrown on error interacting with file or filesystem
	 */
	static submissionListFromDir(/*File*/ directory, /*String*/ glob, /*Tokenizer*/ splitter, /*boolean*/ recursive){
		checkNotNull(directory);
		checkNotNull(glob);
		checkArgument(!glob.isEmpty(), "Glob pattern cannot be empty!");
		checkNotNull(splitter);

		if(!directory.exists()) {
			throw new Error("Does not exist: " + directory.getAbsolutePath());
		}
		else if(!directory.isDirectory()) {
			throw new Error("Not a directory: " + directory.getAbsolutePath());
		}

		// List all the subdirectories we find
		let contents = directory.listFiles().filter(function(f){return f.isDirectory});

		let submissions = new Set();
		contents.forEach(function(f){
			try {
				let s = Submission.submissionFromDir(f, glob, splitter, recursive);
				submissions.add(s);
				if(s.getContentAsString().isEmpty()) {
					console.warn("Warning: Submission " + s.getName() + " is empty!");
				}
				else {
					console.debug("Created submission with name " + s.getName());
				}
			}
			catch (e) {
				console.warn("Could not create submission from directory " + f.getName() + " - no files matching pattern found!");
			}
		});

		return submissions;
	}

	/**
	 * Get a single submission from a directory.
	 *
	 * @param directory Directory containing the student's submission
	 * @param glob Match pattern used to identify files to include in submission
	 * @param splitter Tokenizes files to produce Token List in this submission
	 * @return Single submission from all files matching the glob in given directory
	 * @throws IOException Thrown on error interacting with file
	 */
	static submissionFromDir(directory, glob, splitter, isRecursive){
		checkNotNull(directory);
		checkNotNull(glob);
		checkArgument(!glob.isEmpty(), "Glob pattern cannot be empty!");
		checkNotNull(splitter);

		if(!directory.exists()) {
			throw new Error("Does not exist: " + directory.getAbsolutePath());
		}
		else if(!directory.isDirectory()) {
			throw new Error("Not a directory: " + directory.getAbsolutePath());
		}

		// TODO consider verbose logging of which files we're adding to the submission?

		let files = Submission.getAllMatchingFiles(directory, glob, isRecursive);

		return Submission.submissionFromFiles(directory.getName(), files, splitter);
	}

	/**
	 * Recursively find all files matching in a directory.
	 *
	 * @param directory Directory to search in
	 * @param glob Match pattern used to identify files to include
	 * @return List of all matching files in this directory and subdirectories
	 */
	static getAllMatchingFiles(directory, glob, recursive){
		checkNotNull(directory);
		checkNotNull(glob);
		checkArgument(!glob.isEmpty(), "Glob pattern cannot be empty");

		if(!directory.exists()) {
			throw new Error("Does not exist: " + directory.getAbsolutePath());
		}
		else if(!directory.isDirectory()) {
			throw new Error("Not a directory: " + directory.getAbsolutePath());
		}

		let matcher = new Minimatch(glob);
		let allFiles = [];

		if(recursive) {
			console.trace("Recursively traversing directory " + directory.getName());
		}

		// Get files in this directory
		let contents = directory.listFiles((f) => matcher.match(f.getAbsolutePath().getFileName()));

		// TODO consider mapping to absolute paths?

		// Add this directory
		allFiles = allFiles.concat(contents);

		// Get subdirectories
		let subdirs = directory.listFiles().filter(function(d){ return d.isDirectory();});

		// Recursively call on all subdirectories if specified
		if(recursive) {
			subdirs.forEach(function(subdir){
				allFiles.addAll(Submission.getAllMatchingFiles(subdir, glob, true));
			});
		}

		return allFiles;
	}

	/**
	 * Turn a list of files and a name into a Submission.
	 *
	 * The contents of a submission are built deterministically by reading in files in alphabetical order and appending
	 * their contents.
	 *
	 * @param name Name of the new submission
	 * @param files List of files to include in submission
	 * @param splitter Tokenizer for files in the submission
	 * @return A new submission formed from the contents of all given files, appended and tokenized
	 * @throws IOException Thrown on error reading from file
	 * @throws NoMatchingFilesException Thrown if no files are given
	 */
	static submissionFromFiles(name, files, splitter){
		checkNotNull(name);
		checkArgument(!name.isEmpty(), "Submission name cannot be empty");
		checkNotNull(files);
		checkNotNull(splitter);

		if(files.size() == 0) {
			throw new Error("No matching files found, cannot create submission named \"" + name + "\"");
		}

		// To ensure submission generation is deterministic, sort files by name, and read them in that order
		let orderedFiles = files.sort(function(file1, file2){
			return file1.getName().compareTo(file2.getName());
		});

		let tokenList = new TokenList(splitter.getType());

		// Could do this with a .stream().forEach(...) but we'd have to handle the IOException inside
		let fileContent = orderedFiles
			.map(function(f) {
				let content = f.content;
				if(!content.endsWith("\n") && !content.isEmpty()) {
					content = content + "\n";
				}
				return content;
			})
			;

		let contentString = fileContent.join('\n');

		// Split the content
		tokenList.addAll(splitter.splitString(contentString));

		if(tokenList.size() > 7500) {
			console.warn("Warning: Submission " + name + " has very large token count (" + tokenList.size() + ")");
		}

		return new Submission(name, contentString, tokenList);
	}



	/**
	 * Construct a new Concrete Submission with given name and contents.
	 *
	 * Token content should be the result of tokenizing the string content of the submission with some tokenizer. This
	 * invariant is maintained throughout the project, but not enforced here for performance reasons. It is thus
	 * possible to create a ConcreteSubmission with Token contents not equal to tokenized String contents. This is not
	 * recommended and will most likely break, at the very least, Preprocessors.
	 *
	 * @param name Name of new submission
	 * @param content Content of submission, as string
	 * @param tokens Content of submission, as token
	 */
	ConcreteSubmission(name, content, tokens) {
		checkNotNull(name);
		checkArgument(!name.isEmpty(), "Submission name cannot be empty");
		checkNotNull(content);
		checkNotNull(tokens);

		assert(name instanceof 'String','name expected to be string');
		assert(content instanceof 'String','content expected to be string');
		assert(content instanceof 'Array','tokens expected to be an array');

		this.name = name;
		this.content = content;
		this.tokenList = this.TokenList.immutableCopy(tokens);
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
		if(!(other instanceof 'ConcreteSubmission')) {
			return false;
		}

		let isEqual =
			other.getName().equals(this.name)
			&& other.getNumTokens() == this.getNumTokens()
			&& other.getContentAsTokens().equals(this.tokenList)
			&& other.getContentAsString().equals(this.content)
			;
		return isEqual;
	}

	hashCode() {
		return this.name.hashCode();
	}

	/**
	 * Compare two Submissions, using natural ordering by name.
	 *
	 * Note that the natural ordering of ConcreteSubmission is inconsistent with equality. Ordering is based solely on
	 * the name of a submission; two submissions with the same name, but different contents, will have compareTo()
	 * return 0, but equals() return false
	 *
	 * @param other Submission to compare to
	 * @return Integer indicating relative ordering of the submissions
	 */
	compareTo(other) {
		return this.name.compareTo(other.getName());
	}
}
