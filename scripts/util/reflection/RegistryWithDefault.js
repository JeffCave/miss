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
	RegistryWithDefault
};

import {Registry} from '../../util/reflection/Registry.js';
import {checkNotNull} from '../../util/misc.js';

/**
 * Extension of a Registry with the ability to retrieve a default implementation.
 */
export default class RegistryWithDefault extends Registry {
	/**
	* Create a Registry instance for implementations of a given base
	* class in the given package and subpackages.
	*/
	constructor(classList, baseClazz, ignoredImplementations, defaultImplementation){
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
