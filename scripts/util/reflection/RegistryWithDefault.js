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

import { Registry } from '/scripts/util/reflection/Registry.js';
import { checkNotNull } from '/scripts/util/misc.js';

/**
 * Extension of a Registry with the ability to retrieve a default implementation.
 */
export class RegistryWithDefault extends Registry {
	/**
	* Create a Registry instance for implementations of a given base class in the given package and subpackages.
	*
	* @param initPath Package to (recursively) search for implementations
	* @param baseClazz Base class or interface which all implementations in the registry extend or implement
	* @param defaultImplementation Name of default implementation for this registry
	* @param ignoredImplementations Names of implementations which will not be included in the registry
	* @throws NoSuchImplementationException Thrown if no implementation with the name of the requested default exists
	*/
	RegistryWithDefault(classList, baseClazz, ignoredImplementations, defaultImplementation){
		super(classList, baseClazz, ignoredImplementations);

		checkNotNull(defaultImplementation);

		this.instanceOfDefault = super.getImplementationInstance(defaultImplementation);

		this.defaultImplementation = defaultImplementation;
	}

	/**
	 * @return Name of the default implementation for this registry
	 */
	getDefaultImplementationName() {
		return this.defaultImplementation;
	}

	/**
	 * @return Instance of the default implementation for this registry
	 */
	getDefaultImplementation() {
		return this.instanceOfDefault;
	}


}
