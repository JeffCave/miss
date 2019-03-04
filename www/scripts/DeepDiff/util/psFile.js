'use strict';

export{
	psFile
};

/*
global File
*/

class psFile extends File{

	constructor(blob, name = '', options = {}){
		if(!blob){
			console.error('This is bad!!');
		}
		name = name || blob.name || '';
		options.type = options.type || blob.type || '';

		if(!Array.isArray(blob)){
			blob = [blob];
		}
		super(blob, name, options);

		this._ = {};
		this.relativePath = blob.relativePath || this.webkitRelativePath || options.relativePath || '';

		let path = this.fullPath;
		path = path.split('/').filter(p=>{return p!=='';});
		this._.name = path.pop();
		this.relativePath = path.join('/');
	}

	get fullPath(){
		let path = [this.relativePath, this.name].join('/').split('/');
		while(path[0] === ''){
			path.shift();
		}
		path = path.join('/');
		return path;
	}

	get name(){
		let n = this._.name || super.name;
		return n;
	}

	async read(type='buffer'){
		if(this._content){
			return this._content;
		}
		let p = new Promise((resolve)=>{
			let reader = new FileReader();
			reader.onload = function(evt) {
				resolve(evt.target.result);
			};
			if(type === 'text'){
				reader.readAsText(this);
			}
			else{
				reader.readAsArrayBuffer(this);
			}
		});
		this._content = await p;
		return this._content;
	}

	async toJSON(){
		let json = {
			'type': 'application/octet',
			'name': this.name,
			'relativePath': this.relativePath,
			'fullPath': this.fullPath,
		};
		json.type = this.type || json.type;
		json.blob = await this.read('text');
		let name = json.type.split('/').shift();
		if(name !== 'text'){
			json.blob = window.btoa(json.blob);
		}
		return json;
	}

	static async toJSON(file){
		let blob = new psFile(file);
		let json = await blob.toJSON();
		return json;
	}

}
