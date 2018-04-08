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
	AlgorithmRegistry
};

import {LineSimilarityChecker} from '../algorithm/linesimilarity/LineSimilarityChecker.js';
import {RegistryWithDefault} from '../util/reflection/RegistryWithDefault.js';


/**
 * Registry for all supported similarity detection algorithms.
 */
export default class AlgorithmRegistry extends RegistryWithDefault {

	constructor(){
		if("instance" in AlgorithmRegistry){
			throw new Error("Singleton generation errro");
		}

		let detectors = [
				'SmithWaterman',
				'LineSimilarityChecker'
			];
		let def = LineSimilarityChecker.getInstance().getName();
		super( detectors, "SimilarityDetector", [], def);

		AlgorithmRegistry.instance = this;
	}

	/**
	 * @return Singleton instance of AlgorithmRegistry
	 */
	static getInstance() {
		if(!("instance" in AlgorithmRegistry)) {
			AlgorithmRegistry.instance = new AlgorithmRegistry();
		}

		return AlgorithmRegistry.instance;
	}


	toString() {
		return "Singleton instance of AlgorithmRegistry";
	}

}
