'use strict';

// define the item component
Vue.component('treeview', {
	template: '#treeview-template',
	props: {
		filelist: Array,
		files:Object
	},
	data: function () {
		return { open: false };
	},
	computed: {
		isFolder: function () {
			return this.model.children && this.model.children.length;
		},
		filecollection:function(){
			let data = this.files;
			if(data){
				if('name' in data){
					return data;
				}
				else{
					data = Object.entries(data)
						.map((d)=>{
							let name = d[0].split('');
							while(name[0] === '/') name.shift();
							return {
								'name':name.join(''),
								'content':d[1]
							};
						});
				}
			}
			else{
				data = this.filelist;
			}
			if(Array.isArray(data)){
				data = this.walk(data);
				data = {"name":"","children": data};
			}
			return data;
		},
		model: function(){
			return this.filecollection();
		}
	},
	methods: {
		walk: function(path){
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
					if(typeof d[1] === 'string' || d[1] instanceof Promise){
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
		},
		dragstart:function(event){
			let path = event.target.dataset.path;
			event.dataTransfer.setData("text/plain", path);
		}

	}
});
