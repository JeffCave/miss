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

import {Token} from '/scripts/token/Token.js';


/**
 * Concrete implementation of comparable tokens with varying type and validity.
 *
 * Tokens are backed by an Object. In the case of Line and Whitespace tokens, this should be a string. In the case of
 * Character tokens, this should be a Character. This is not enforced for performance reasons, but the invariant is
 * maintained throughout the program.
 */
export class ConcreteToken extends Token {}
