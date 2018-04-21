'use strict';
export {
	DisplaySubmissions,
	DisplayFiles
};

/*
global d3
*/

function walk(path){

	function walker(obj,path,value){
		let curr = obj;
		let last = null;
		let n = null;
		path.forEach(function(node){
			if(!(node in curr)){
				curr[node] = {};
			}
			last = curr;
			n = node;
			curr = curr[node];
		});
		last[n] = value;
		return obj;
	}

	function unwalk(obj){
		let entries = Object.entries(obj);
		let list = obj;
		if(typeof list === 'object'){
			list = entries.map(d=>{
				return {
					"name": d[0],
					"children": unwalk(d[1])
				};
			})
			.sort(function(a,b){
				return a.name.localeCompare(b.name);
			});
		}
		return list;
	}

	let rtn = Object.entries(path)
		.reduce(function(agg,entry){
			let path = entry[0].split('/');
			agg = walker(agg,path,entry[1]);
			return agg;
		},{});
	rtn = unwalk(rtn);
	return rtn;
}


function DisplayFiles(element,files){
	let holder = document.querySelector('script[name="filetest"]');

	let templates = {
		ul: '<ul></ul>',
		li: holder.innerHTML
	};

	let newElem = document.createElement('div');
	holder.parentNode.insertBefore(newElem,holder);
	holder.parentNode.removeChild(holder);
	holder = newElem;

	Object.observe(files,function(changes){
		//console.log("Changes: ", changes);
		let data = changes
			.filter(d=>{
				return d.name === 'files';
			})
			.pop()
			;
		if(!data){
			return;
		}

		data.object.files.then(function(files){
			data = walk(files);
			data = {"children": data};
			holder.innerHTML = Mustache.render(templates.li,data,templates);
		});
	});

}

export default function DisplaySubmissions(element,submissions){
	let dom = d3.select(element);

	let templates = {
		ul: '<ul></ul>',
		li: dom.html()
	};
	dom.html('');

	Object.observe(submissions,function(changes){
		//console.log("Changes: ", changes);
		let data = changes
			.pop()
			.object
			.sort((a,b)=>{return a.name.localeCompare(b.name);})
			;

		let binding = dom.selectAll('li')
			.data(data,function(d){
				return d.name;
			})
			;
		binding
			.enter()
				.append('li')
			.merge(binding)
				.text(function(d){
					let html = d.name;
					return html;
				})
			.exit()
				.remove()
			;
	});
}
