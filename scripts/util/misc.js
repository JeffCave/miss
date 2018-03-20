function checkNotNull(value = null){
	if(value === null){
		throw "Null Exception";
	}

	if(typeof value === 'undefined'){
		throw "Null Exception";
	}
}

function checkArgument(value = null, msg = ""){
	checkNotNull(value);
	checkNotNull(msg);

	if(!value){
		console.warn(msg);
	}
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
