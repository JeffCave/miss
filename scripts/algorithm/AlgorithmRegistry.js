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

import {LineSimilarityChecker} from '/scripts/algorithm/linesimilarity/LineSimilarityChecker';
import {RegistryWithDefault} from '/scripts/util/reflection/RegistryWithDefault';


/**
 * Registry for all supported similarity detection algorithms.
 */
export class AlgorithmRegistry extends RegistryWithDefault {

	constructor(){
		if("instance" in AlgorithmRegistry){
			throw new Error("Singleton generation errro");
		}
		AlgorithmRegistry.instance = this;

		let detectors = [
				'SmithWaterman',
				'LineSimilarityChecker'
			];
		let def = LineSimilarityChecker.getInstance().getName();
		super( detectors, "SimilarityDetector", [], def);
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
