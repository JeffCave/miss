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
export {
	PreprocessorRegistry
};

import {Registry} from '../util/reflection/Registry.js';
import {checkNotNull} from '../util/misc.js';

/**
 * Registry to obtain valid preprocessors.
 */
export default class PreprocessorRegistry extends Registry {
	constructor() {
		if('instance' in PreprocessorRegistry) {
			throw new Error('Instantiation of Singleton');
		}
		[
			'CommonCodeLineRemovalPreprocessor',
			'LowercasePreprocessor',
			'WhitespaceDeduplicationPreprocessor',
		].forEach(function(d){
			PreprocessorRegistry.addPreprocessor(d);
		});

		let def = 'WhitespaceDeduplicationPreprocessor';
		super( PreprocessorRegistry.preprocessors , "SubmissionPreprocessor", [], def);
	}

	/**
	 * @return Singleton instance of PreprocessorRegistry
	 */
	static getInstance() {
		if(!('instance' in PreprocessorRegistry)) {
			PreprocessorRegistry.instance = new PreprocessorRegistry();
		}
		return PreprocessorRegistry.instance;
	}

	static addPreprocessor(preprocessor){
		checkNotNull(preprocessor);

		if(!('preprocessors' in PreprocessorRegistry)){
			PreprocessorRegistry.preprocessors = [];
		}
		if(0 > PreprocessorRegistry.preprocessors.indexOf(preprocessor)){
			PreprocessorRegistry.preprocessors.push(preprocessor);
		}
	}

	toString() {
		return "Singleton instance of PreprocessorRegistry";
	}
}
