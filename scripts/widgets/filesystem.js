'use strict';
export {
	DisplaySubmissions,
	DisplayFiles,
	walk
};

/*
global d3
*/

function walk(path){

	function walker(obj,path,value){
		let curr = obj;
		let last = null;
		let n = null;
		path.forEach(function(node,i,path){
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

	function unwalk(obj,parent={}){
		let entries = Object.entries(obj);
		let list = obj;
		if(typeof list === 'object'){
			list = entries.map(d=>{
				let item = {
					"name": d[0],
					"parent": parent
				};
				item.path = [item.name];
				if(parent.path){
					item.path = parent.path.concat(item.path);
				}
				item.children = unwalk(d[1],item);
				item.path = item.path.join('/');
				return item;
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

		function dragstart(event){
			let path = event.target.dataset.path;
			event.dataTransfer.setData("text/plain", path);
		}

		let files = data.object.files;
		data = walk(files);
		data = {"children": data};
		holder.innerHTML = Mustache.render(templates.li,data,templates);

		let elems = holder.querySelectorAll('details');
		elems = Array.from(elems);
		elems.forEach(function(e){
			e.addEventListener('dragstart',dragstart);
		});

	});

}



export default function DisplaySubmissions(element,db){
	let holder = document.querySelector(element);

	let templates = {
		ul: '<ul></ul>',
		li: holder.innerHTML
	};

	let newElem = document.createElement('ul');
	holder.parentNode.insertBefore(newElem,holder);
	holder.parentNode.removeChild(holder);
	holder = newElem;
	let dom = d3.select(holder);

	let subChange = null;
	db.changes({filter:'checksims/submissions',live:true})
		.on('change',(e)=>{
			if(subChange !== null){
				return;
			}
			subChange = setTimeout(function(){
				db.query('checksims/submissions',{include_docs:true}).then((data)=>{
					subChange = null;

					let binding = dom.selectAll('li')
						.data(data.rows,function(d){
							return d.doc.name;
						})
						;
					binding
						.enter()
							.append('li')
						.merge(binding)
							.html(function(d){
								let html = Mustache.render(templates.li,d.doc,templates);
								return html;
							})
						.exit()
							.remove()
						;
				});
			},100);
		});
}
