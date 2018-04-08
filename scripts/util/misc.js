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

function hashCode(str){
	const shiftSize = 6;
	const hashSize = 53;
	const wrapSize = hashSize - shiftSize;
	let hash = str.split('')
		.map(function(d){
			let c = d.toCharCodeAt(0);
			return c;
		})
		.reduce(function(a,d){
			let wrap =  a >> wrapSize;
			a = a << shiftSize;
			a = a ^ d;
			a = a | wrap;
			return a;
		},0)
		;
	return hash;
}

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
