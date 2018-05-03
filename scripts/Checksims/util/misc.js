'use strict';
export{
	checkNotNull,
	checkArgument,
	hasher,
	hashCode,
	Pair
};

/*
global jsSHA
*/

export default function checkNotNull(value = null){
	if(value === null || typeof value === 'undefined'){
		console.trace("Null Exception (checkNotNull)");
		throw new Error("Null Exception (checkNotNull)");
	}
}

function checkArgument(value = null, msg = ""){
	checkNotNull(value);
	checkNotNull(msg);

	assert(value,msg);
}

class Pair extends Set{
	constructor(vals){
		console.warn('Usage of class "Pair"');
		super(vals);
	}
}

function assert(check, msg = "no message"){
	check = !(check === false);
	if(!check){
		throw new Error('Assertion failure: ' + msg);
	}
}

function hasher(value){
	let hasher = new jsSHA("SHA-512", "TEXT");
	hasher.update(value);
	let hashed = hasher.getHash('HEX');
	return hashed;
}


/**
 * Implementation of Java String hashcode
 *
 * Based on reading at stack... there are some improvements to my original implementation
 * https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 */
function hashCode(str){
	const shiftSize = 5;
	const hashSize = 53;
	const wrapSize = hashSize - shiftSize;
	let hash = 0;
	for(let i=0; i<str.length; i++){
		let c = str.charCodeAt(i);
		//console.debug("Hash: "+ hash.toString(2) + '-' + c.toString(2));
		let wrap =  hash >>> wrapSize;
		//console.debug(" - Wrap: " + wrap.toString(2));
		hash = hash << shiftSize;
		//console.debug(" - 1: " + hash.toString(2));
		hash = hash ^ c;
		//console.debug(" - 2: " + hash.toString(2) + ' ^ ' + c.toString(2));
		hash = hash | wrap;
		//console.debug(" - 3: " + hash.toString(2));
	}
	//console.debug("Done: "+ hash.toString(2));
	return hash;
}
String.prototype.hashCode = hashCode;


JSON.clone = function(obj){
	return JSON.parse(JSON.stringify(obj));
};

JSON.merge = function(a){
	if(!Array.isArray(a)){
		a = [a];
	}
	let obj = a.reduce(function(a,d){
		Object.entries(d).forEach(function(pair){
			pair = JSON.clone(pair);
			a[pair[0]] = pair[1];
		});
		return a;
	},{});
	return obj;
};

export function docsEqual (aDoc,bDoc){
	if(typeof aDoc === 'string'){
		aDoc = JSON.parse(aDoc);
	}
	aDoc = JSON.clone(aDoc);

	delete aDoc._id; delete aDoc._rev;
	delete bDoc._id; delete bDoc._rev;

	aDoc = JSON.stringify(aDoc);
	bDoc = JSON.stringify(bDoc);

	let areSame = (aDoc === bDoc);
	return areSame;
}
