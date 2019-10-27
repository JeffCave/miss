'use strict';

import * as util from '../DeepDiff/util/misc.js';

/*
global _
global HTMLElement
*/

export default class psAlert extends HTMLElement {
	constructor(){
		super();

		this.style.display = 'none';

		let shadow = this.attachShadow({mode: 'open'});
		shadow.innerHTML = '<style>'+psAlert.DefaultCSS+'</style>'+psAlert.Template;
		this.content = shadow.querySelector('blockquote');

		let clickarea = shadow.querySelector('div');
		clickarea.addEventListener('click',(event)=>{
			if(event.target === clickarea){
				this.style.display = 'none';
				this.content.classList.remove('show');
			}
		});
	}

	display(type,msg){
		this.content.classList.add(type);
		this.content.innerHTML = msg;
		this.style.display = 'block';
		setTimeout(()=>{
			this.content.classList.add('show');
		},100);
	}

	info(msg){
		this.display('info',msg);
	}

	warn(msg){
		this.display('warn',msg);
	}

	error(msg){
		this.fail(msg);
	}

	fail(msg){
		this.display('fail',msg);
	}

	static get Template(){
		return `
<div>
 <blockquote><i style='position:fixed;float:right;'>X</i><output>bad things</output></blockquote>
</div>
		`;
	}


	static get DefaultCSS(){
		return `
div{
	position:fixed;
	top:0;
	left:0;
	right:0;
	bottom:0;
	background-color:rgba(0,0,0,0.5);
	z-index:10000;
}
div > blockquote{
	padding:1em;
	margin:2em;
	margin:auto;
	max-width:25em;
	opacity:0;
}
blockquote.show{
	opacity:1;
	transition-delay: 0.0s;
	transition: opacity 0.5s;
}
blockquote.fail{
	background-color:var(--notice-fail-off);
	border:0.3em solid var(--notice-fail-low);
	color: var(--notice-fail-high);
	font-weight: bold;
	padding:1em;
	border-radius: 0.25em;
}

blockquote.warn{
	background-color:var(--notice-warn-off);
	border:0.3em solid var(--notice-warn-low);
	color: var(--notice-warn-high);
	font-weight: bold;
	padding:1em;
	border-radius: 0.25em;
}

blockquote.info{
	background-color:var(--notice-info-off);
	border:0.3em solid var(--notice-info-low);
	color: var(--notice-info-high);
	font-weight: bold;
	padding:1em;
	border-radius: 0.25em;
}

		`;
	}

}



window.customElements.define('ps-alert',psAlert);
try{
	/* global Vue */
	if(Vue && !Vue.config.ignoredElements.includes('ps-logger')){
		Vue.config.ignoredElements.push('ps-logger');
	}
}
catch(err){}
