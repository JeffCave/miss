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
global TokenType
global ConcreteToken
global TokenList
global Tokenizer
global checkNotNull
*/
loader.load([
	,'/scripts/token/TokenType.js'
	,'/scripts/token/ConcreteToken.js'
	,'/scripts/token/TokenList.js'
	,'/scripts/token/tokenizer/Tokenizer.js'
	,'/scripts/util/misc.js'
]);


/**
 * Split a file into a list of character tokens.
 */
class CharTokenizer extends Tokenizer {
    /**
     * @return Singleton instance of CharTokenizer
     */
    static getInstance() {
        if(!('instance' in CharTokenizer)) {
            CharTokenizer.instance = new CharTokenizer();
        }

        return CharTokenizer.instance;
    }

    /**
     * Split a string into character tokens.
     *
     * @param string String to split
     * @return Input string, with a single token representing each character
     */
    splitString(string) {
        checkNotNull(string);

        let toReturn = new TokenList(this.getType());

		string.split('')
			.map((character) => {return new ConcreteToken(character, TokenType.CHARACTER);})
			.forEachOrdered(function(token){
				toReturn.add(token);
			});

			return toReturn;
		}

    getType() {
        return TokenType.CHARACTER;
    }

    toString() {
        return "Singleton instance of FileCharSplitter";
    }
}
