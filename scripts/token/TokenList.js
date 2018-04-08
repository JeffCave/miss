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
	TokenList
};

import {checkNotNull,checkArgument} from '../util/misc.js';

/**
 * A list of tokens of a specific type.
 */
export default class TokenList extends Array{
	/**
	 * Create a TokenList accepting a specific type of token.
	 *
	 * @param type Type of token which will be allowed in the list
	 */
	constructor(type=null, baseList=null) {
		super();

		checkNotNull(type);

		let isType = Object.values(TokenList.TokenType).some(function(t){
			return type === t;
		});
		checkArgument(isType,"Expected type to be of TokenType. Received " + type);

		if(Array.isArray(baseList)){
			let the = this;
			baseList.forEach(function(d){
				the.push(d);
			});
		}

		this.type = type;
	}

	static get TokenType(){
		return {
			CHARACTER: "character",
			WHITESPACE: "whitespace",
			LINE: "line"
		};
	}

	/**
	 * Join each token in the list in order, using a tokenization-appropriate separating character.
	 *
	 * @param onlyValid If true, ignore invalid tokens when joining
	 * @return String composed of each element in the token list, in order, separated by appropriate character
	 */
	join(sepChar = null, onlyValid = false) {
		if(this.length == 0) {
			return "";
		}

		if(typeof(sepChar) === 'boolean'){
			let swap = onlyValid;
			onlyValid = sepChar;
			sepChar = swap;
		}

		if(sepChar === null || sepChar === false){
			switch(this.type) {
				case TokenList.TokenType.CHARACTER: sepChar = ""; break;
				case TokenList.TokenType.WHITESPACE: sepChar = " "; break;
				case TokenList.TokenType.LINE: sepChar = "\n"; break;
				default: sepChar = ""; break;
			}
		}
		let b = Array.from(this)
			.sort(function(a,b){
				return a.lexeme - b.lexeme;
			})
			// TODO: This should not be necessary. Find a way to prevent NULL insertion to the list
			.filter(function(d){
				let keep = (d || false) !== false;
				return keep;
			})
			.map(function(token){
				if(!onlyValid || token.isValid()) {
					return token.getTokenAsString();
				}
			})
			.join(sepChar)
			;

		return b;
	}

	concat(tokenList){
		checkArgument(tokenList instanceof Array,"Token list can only accept token lists");
		let list = new TokenList(this.type);
		this.forEach(function(d){list.push(d);});
		tokenList.forEach(function(d){list.push(d);});
		return list;
	}

	/**
	 * Peforms a deep copy of a TokenList, returning an immutable version of the initial list with immutable tokens.
	 *
	 * @param cloneFrom List to copy
	 * @return Immutable copy of cloneFrom
	 */
	static immutableCopy(cloneFrom) {
		checkNotNull(cloneFrom);
		checkArgument(cloneFrom instanceof TokenList,'Parameter `cloneFrom` must be instance of type `TokeList`');
		let tmp = Array.from(cloneFrom).slice(0);
		return new TokenList(cloneFrom.type, tmp);
	}

	/**
	 * Perform a deep copy of a TokenList.
	 *
	 * TODO add a copy constructor as well
	 *
	 * @param cloneFrom List to deep copy
	 * @return Cloned copy of the tokenization list
	 */
	static cloneTokenList(cloneFrom) {
		checkNotNull(cloneFrom);
		let newList = Array.from(cloneFrom)
			.map(function(token){
				return token.clone();
			});
		newList = new TokenList(cloneFrom.type, newList);
		return newList;
	}

	/**
	 * TODO: This depth of equality checking seems superfluous to me. Check to see that it is required by the algorithm.
	 */
	equals(other) {
		if(!(other instanceof TokenList)) {
			return false;
		}
		if(other.type !== this.type){
			return false;
		}
		if(other.length !== this.length){
			return false;
		}

		other = Array.from(other).map(function(token){
			return token.getLexeme();
		});
		let areSame = Array.from(this).every(function(token){
			let lexeme = token.getLexeme();
			let index = other.indexOf(lexeme);
			if(0 > index){
				return false;
			}
			other.splice(index,1);
			return true;
		});
		if(!areSame || other.length > 0){
			return false;
		}

		// The super.equals() call here is bad practice because we can't *guarantee* it's a PredicatedList<Token>
		// However, the instanceof TokenList should ensure that invariant is met
		return true;
	}

	toString() {
		return "Token list of type " + this.type.toString() + " containing " + super.toString();
	}

	hashCode() {
		return this.type.hashCode() ^ super.hashCode();
	}

	numValid() {
		return Number.parseInt(this.filter(function(d){ return d.isValid();}).length,10);
	}

	size(){
		return this.length;
	}
}
