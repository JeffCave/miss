'use strict';

export{
	psTreeView
};

/*
global HTMLElement
*/

class psTreeView extends HTMLElement{
	constructor(){
		super();

		this._ = {
			open: false,
			files: {},
			isnode: (value)=>{
				let is = ['fullPath','name','relativePath','type'].every(f=>{
					let type = typeof value[f];
					let isMatch = type === 'string';
					return isMatch;
				})
				;
				is = is && 'blob' in value;
				return is;
			}
		};


		this._.shadow = this.attachShadow({mode:'open'});
		this._.shadow.innerHTML = `
			<style>
				:host{
					margin:0;
					padding:0;
				}
				details{
					margin-left:1em;
				}
				details > *{
					margin-left: 1em;
				}
				:host > summary, details > summary{
					margin-left: 1em;

				}
			</style>
			<details open>
			 <summary></summary>
			</details>
		`;


	}

	Render(){
		let summary = this._.shadow.querySelector('summary');
		summary.textContent = this.name;

		if(this.isFolder){
			this.RenderFolder();
		}
		else{
			this.RenderNode();
		}
	}

	RenderNode(){
		let dom = this._.shadow;
		let details = dom.querySelector('details');
		let summary = dom.querySelector('summary');

		// nodes do not display a expander
		details.style.display = 'none';
		// move the summary to outside the details
		dom.prepend(summary);
		// nuke the details section
		details.innerHTML = '';
	}

	RenderFolder(){
		let dom = this._.shadow;
		let details = dom.querySelector('details');
		let summary = dom.querySelector('summary');

		// nodes do display a expander
		details.style.display = 'block';
		// move the summary to inside the details
		details.prepend(summary);
		// if we don't have a sub file section,
		// create one
		let trees = Array.from(dom.querySelectorAll("ps-treeview"));
		while(trees.length < this.asFileCollection.children.length){
			let tree = new psTreeView();
			details.append(tree);
			trees = Array.from(dom.querySelectorAll("ps-treeview"));
		}
		for(let t=0; t<trees.length; t++){
			let tree = trees[t];
			let files = this.asFileCollection.children[t];
			tree.files = files;
		}
	}

	get files(){
		return this.asFileCollection;
	}
	set files(values){
		this._.data = null;
		this._.files = values;
		if(typeof values.name === 'string'){
			this._.data = values;
			this._.files = values.children;
		}
		this.Render();
	}

	get name(){
		return this.asFileCollection.name;
	}

	get isFolder() {
		let self = this.asFileCollection;
		let isfolder =
			typeof self.name === 'string' &&
			Array.isArray(self.children) &&
			self.children.length > 0
			;
		return isfolder;
	}

	get isNode(){
		return this._.isnode;
	}
	set isNode(values){
		this._.isnode = values;
	}

	get filecollection(){
		console.warn("Deprecated: use 'psTreeView.asFileCollection' instead");
		return this.asFileCollection;
	}

	get asFileCollection(){
		if(this._.data){
			return this._.data;
		}

		let data = this._.files;
		let isProcessed = (data.length && ('name' in data[0]) && ('children' in data[0]));
		if(!isProcessed){
			data = Object.entries(data)
				.map((d)=>{
					let name = d[0].split('');
					while(name[0] === '/') name.shift();
					return {
						'name':name.join(''),
						'content':d[1]
					};
				});
			data = this.walk(data);
			data = {name:'',children:data};
		}

		this._.data = data;
		return data;
	}

	get model(){
		console.warn("Deprecated: use 'asFileCollection' instead");
		return this.asFileCollection;
	}



	walk(path, isNode = this.isNode){
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
			if(typeof obj !== 'object'){
				throw new Error("This case should never exist");
			}
			let entries = Object.entries(obj);
			let list = [];
			for(let i in entries){
				let d = entries[i];
				let item = {
					"name": d[0],
					"parent": parent
				};
				item.path = [item.name];
				if(parent.path){
					item.path = parent.path.concat(item.path);
				}
				if(typeof d[1] === 'string' || isNode(d[1])){
					item.content = d[1];
				}
				else{
					item.children = unwalk(d[1],item);
				}

				while (item.path[0] === '') item.path.shift();
				item.path = item.path.join('/');
				list.push(item);
			}
			list.sort(function(a,b){
				return a.name.localeCompare(b.name);
			});
			return list;
		}

		let rtn = path
			.reduce(function(agg,entry){
				let path = entry.name.split('/');
				agg = walker(agg,path,entry.content);
				return agg;
			},{});
		rtn = unwalk(rtn);
		return rtn;
	}

	dragstart(event){
		let path = event.target.dataset.path;
		event.dataTransfer.setData("text/plain", path);
	}



}


window.customElements.define('ps-treeview',psTreeView);
try{
	/* global Vue */
	if(Vue && !Vue.config.ignoredElements.includes('ps-treeview')){
		Vue.config.ignoredElements.push('ps-treeview');
	}
}
catch(err){}
