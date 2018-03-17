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
 * When distributing Covered Code, include this CDDL HEADER in each
 * file and include the License file at LICENSE.txt.
 * If applicable, add the following below this CDDL HEADER, with the
 * fields enclosed by brackets "[]" replaced with your own identifying
 * information: Portions Copyright [yyyy] [name of copyright owner]
 *
 * CDDL HEADER END
 *
 * Copyright (c) 2014-2015 Nicholas DeMarinis, Matthew Heon, and Dolan Murvihill
 */

'use strict';

import {WhitespaceDeduplicationPreprocessor} from '/scripts/algorithm/preprocessor/WhitespaceDeduplicationPreprocessor.js';

import {Registry} from '/scripts/util/reflection/Registry.js';

/**
 * Registry to obtain valid preprocessors.
 */
export class PreprocessorRegistry extends Registry {
	constructor() {
		let detectors = [
				'CommonCodeLineRemovalPreprocessor',
				'LowercasePreprocessor',
				'WhitespaceDeduplicationPreprocessor',
			];
		let def = WhitespaceDeduplicationPreprocessor.getInstance().getName();
		super( detectors, "SubmissionPreprocessor", [], def);
	}

	/**
	 * @return Singleton instance of PreprocessorRegistry
	 */
	static getInstance() {
		if('instance' in PreprocessorRegistry) {
			PreprocessorRegistry.instance = new PreprocessorRegistry();
		}
		return PreprocessorRegistry.instance;
	}

	toString() {
		return "Singleton instance of PreprocessorRegistry";
	}
}
