export{
	psObjectMap
};

// do this as a polyfill once Vue dependancy is removed
//Object.prototype.map = function(transformer){
function psObjectMap(obj,transformer){
	//obj = this;
	let rtn = {};
	Object.entries(obj).forEach((items)=>{
		let key = items[0];
		let value = items[1];
		let newValue = transformer(value,key,obj);
		rtn[key] = newValue;
	});
	return rtn;
}
