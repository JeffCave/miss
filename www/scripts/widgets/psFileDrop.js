/**
 *
 * Based on:
 * https://css-tricks.com/drag-and-drop-file-uploading/
 *
 */
'use strict';

/*
global Vue
global HTMLElement
global CustomEvent
*/

export default class psFileDrop extends HTMLElement{
	constructor(){
		super();
		// generate a unique number for every file drop
		// that is placed on the page
		psFileDrop.count = (psFileDrop.count||0)+1;

		this._ = {
			onfile: ()=>{}
		};

		let id = 'id-'+window.btoa(Date.now()).replace(/=/g,'');
		let tmpl = [
			'<style>',
			psFileDrop.DefaultCSS,
			'</style>',
			'<label for="'+id+'">',
			' <div>',
			'  <slot>Click or drop something here</slot>',
			' </div>',
			//' <input id="'+id+'" type="file" multiple webkitdirectory mozdirectory />',
			' <input id="'+id+'" type="file" multiple />',
			'</label>'
		].join('\n');

		let shadow = this.attachShadow({mode:'open'});
		shadow.innerHTML = tmpl;
		this._.div = shadow.querySelector('div');
		let input = shadow.querySelector('input');
		this._.input = input;
		let accept = this.getAttribute('accept');
		input.setAttribute('accept',accept);
		input.addEventListener('change',(e)=>{
			this.isDragOver = false;
			var event = new CustomEvent('change',e);
			this.dispatchEvent(event);
		});
		input.addEventListener('dragenter',()=>{
			this.isDragOver = true;
		});
		input.addEventListener('dragleave',()=>{
			this.isDragOver = false;
		});
		input.addEventListener('dragend',()=>{
			this.isDragOver = false;
		});
	}

	get isDragOver(){
		let rtn = this._.div.classList.contains('dragover');
		return rtn;
	}

	set isDragOver(value){
		let dragover = !!value;
		if(dragover){
			this._.div.classList.add('dragover');
		}
		else{
			this._.div.classList.remove('dragover');
		}
	}

	get files(){
		let f = this._.input.files;
		return f;
	}

	get onfile(){
		return this._.onfile;
	}
	set onfile(value){
		if(typeof value !== 'function'){
			return;
		}
		if(this._.onfile === value){
			return;
		}
		this.removeEventListener('change',this._.onfile);
		this._.onfile = value;
		this.addEventListener('change',this._.onfile);
	}

	click(){
		this._.input.click();
	}


	static get DefaultCSS(){
		return `
label {
	display: inline-block;
	position: relative;
	padding:0.75em;
	border:1px solid black;
}

input[type="file"] {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	opacity: 0;
	width: 100%;
}

label div {
	display: flex;
	align-items: center;
	justify-content: center;

}

label div.dragover {
	filter: invert(100%);
	text-shadow: white 1px 0 1px;
}
		`;
	}

}



window.customElements.define('ps-filedrop',psFileDrop);
try{
	/* global Vue */
	if(Vue && !Vue.config.ignoredElements.includes('ps-filedrop')){
		Vue.config.ignoredElements.push('ps-filedrop');
	}
}
catch(err){}
