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
export{
	Registry
};

import {CommonCodeLineRemovalPreprocessor} from '../../preprocessor/CommonCodeLineRemovalPreprocessor.js';
import {LowercasePreprocessor} from '../../preprocessor/LowercasePreprocessor.js';
import {WhitespaceDeduplicationPreprocessor} from '../../preprocessor/WhitespaceDeduplicationPreprocessor.js';
import {SmithWaterman} from '../../algorithm/smithwaterman/SmithWaterman.js';
import {LineSimilarityChecker} from '../../algorithm/linesimilarity/LineSimilarityChecker.js';
import {MatrixToCSVPrinter} from '../../visualizations/similaritymatrix/output/MatrixToCSVPrinter.js';
import {MatrixToHTMLPrinter} from '../../visualizations/similaritymatrix/output/MatrixToHTMLPrinter.js';

import {checkNotNull} from '../../util/misc.js';

/**
 * Parent class for all registry implementations.
 *
 * A Registry contains a number of implementations of a given
 * interface which are contained within a given package. Registries
 * are initialized via reflection; no modification is required to add
 * a new implementation to a registry, so long as it implements the
 * appropriate interface and is in the appropriate package.
 */
export default class Registry {

	/**
	 * Create a Registry instance for implementations of a given base
	 * class in the given package and subpackages.
	 *
	 * Please note that inner classes *WILL NOT BE REGISTERED* - only
	 * top-level classes will be included in a registry!
	 *
	 * @param initPath Package to (recursively) search for implementations
	 * @param baseClazz Base class or interface which all implementations in the registry extend or implement
	 * @param ignoredImplementations Names of implementations which should not be included in the registry.
	 */
	constructor( include = [], baseClazz, ignores=[]) {
		checkNotNull(baseClazz);
		checkNotNull(ignores);
		checkNotNull(include);

		this.ignored = Array.from(new Set(ignores));
		this.baseClass = baseClazz;

		// The final list should never change at runtime
		this.registeredHandlers = this.registerAll(include);
	}

	/**
	 * @return Names of all supported implementations in this registry
	 */
	getSupportedImplementationNames() {
		return Array.from(this.registeredHandlers.keys());
	}

	/**
	 * Get an instance of an implementation with given name.
	 *
	 * @param name Name to search for
	 * @return Instance of implementation with given name
	 * @throws NoSuchImplementationException Thrown if no instance with given name can be found
	 */
	getImplementationInstance(name){
		checkNotNull(name);
		name = name.toLowerCase();

		if(!this.registeredHandlers.has(name)) {
			throw new Error("No implementation available with name " + name);
		}

		let the = this;
		return new Promise(function(resolve, reject){
				resolve(the.registeredHandlers.get(name));
			});
	}

	/**
	 * Instantiate all subclasses of a class in a given package.
	 *
	 * All subclasses MUST implement a static, no arguments getInstance method
	 *
	 * Please note that reflectiveInstantiator ignores inner classes ---
	 * all classes instantiated will be top level
	 */
	registerAll(types) {
		checkNotNull(types);

		let registry = this;

		let allInstances = types.map(function(type){
				// Invoke the method to get an instance
				let instance = eval(type);
				instance = instance.getInstance();
				if(!instance){
					throw new Error('Attempt to register unknown type: ' + type);
				}
				//let name = instance.getName().toLowerCase();
				return instance;
			})
			.filter(function(instance){
				registry.ignored.forEach(function(ignore){
					if(instance instanceof 'ignore'){
						return false;
					}
				});
				return true;
			})
			.reduce(function(a,instance){
				let key = instance.getName().toLowerCase();
				a[key] = instance;
				return a;
			},{})
			;

		allInstances = Object.entries(allInstances);
		allInstances = new Map(allInstances);
		return allInstances;
	}
}
