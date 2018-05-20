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
				data = Object.entries(data)
					.map((d)=>{
						return {
							'name':d[0],
							'content':d[1]
						};
					});
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
