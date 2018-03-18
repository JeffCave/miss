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
global NamedInstantiable
*/
loader.load([
	'/scripts/util/reflection/NamedInstantiable.js',
]);

/**
 * Interface for submission preprocessors which act on submissions.
 */
class SubmissionPreprocessor extends NamedInstantiable {
	/**
	 * Perform some implementation-specific transformation on the input submission.
	 *
	 * @param submission Submission to transform
	 * @return Result of transforming the input submission's contents
	 * @throws InternalAlgorithmError Thrown on internal error preprocessing submission
	 */
	process(submission){
		throw Error('Use of an interface');
	}
}
