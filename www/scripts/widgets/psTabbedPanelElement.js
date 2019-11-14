'use strict';
export {
	psTabbedPanelElement
};

/*
global HTMLElement
global localStorage
*/

import psPanelElement from './psPanelElement.js';

export default class psTabbedPanelElement extends HTMLElement {
	constructor() {
		super();

		let shadow = this.attachShadow({mode: 'open'});

		let style= document.createElement('style');
		shadow.append(style);
		style.textContent = this.initialCSS;


		let menu = document.createElement('ul');
		shadow.append(menu);

		let slot = document.createElement('slot');
		shadow.append(slot);

		this.tabs = [];
		this.panels = [];
		this.keys = {};
		let panel = localStorage.getItem("tabbedpanel");
		Array.from(this.children).forEach((d,i)=>{
			if(!(d instanceof psPanelElement) || d.state === 'hide'){
				d.style.display = 'none';
				return;
			}
			d.normal();
			d.minimizable = false;

			let li = document.createElement('li');
			li.innerHTML = d.summary;
			menu.append(li);

			d.id = d.id || d.title;
			let key = [i.toString(), d.id].join('=');
			key = key.toLowerCase();
			this.tabs.push(li);
			this.panels.push(d);
			this.keys[key] = i;

			this.tabs[i].addEventListener('click',()=>{
				this.activate(key);
			});
			this.activate(key);

			// remove a bunch of the panel's formatting that is now controlled
			// by the tab
			d.domIcon.style.display = 'none';
			d.querySelector('h1').style.display = 'none';
			d.style.border = '0 solid black';
		});
		this.activate(panel);
	}

	activate(key){
		key = key || Object.keys(this.keys)[0];
		key = key.toLowerCase();
		localStorage.setItem("tabbedpanel", key);

		let panel = this.keys[key];
		if(!panel && panel!==0){
			key = key.replace(/[^0-9a-z]/,'=').split('=');
			key[1] = key.slice(1).join('=');
			for(let k in this.keys){
				k = k.split('=');
				if(k.includes(key[0]) || k.includes(key[1])){
					key = k.join('=');
					break;
				}
			}
			panel = this.keys[key];
			if(!panel && panel!==0){
				return;
			}
		}

		let path = new URL(document.location.href);
		path.hash = this.panels[panel].title;
		path = path.href.replace('#','/');
		path = new URL(path);
		document.title = 'MISS: ' + this.panels[panel].title;
		this.ga('set', 'page', path.pathname);
		this.ga('send', 'pageview');

		for(let p in this.panels){
			p = +p;
			if(p === panel){
				this.panels[p].classList.add('active');
				this.tabs[p].classList.add('active');
				this.panels[p].style.display = 'block';
			}
			else{
				this.panels[p].classList.remove('active');
				this.tabs[p].classList.remove('active');
				this.panels[p].style.display = 'none';
				this.panels[p].normal();
			}
		}
	}

	get ga(){
		return window.ga || (()=>{});
	}

	get initialCSS(){
		return `
@charset 'utf-8';
* {
	/* display:none; */
}
.active{
	display:block;
}
ul {
	display:block;
	padding-left:0;
	margin-top:0;
	border-bottom:1px solid var(--main-highlight);
}
ul > li{
	display: inline-block;
	text-align: center;
	padding-left:0.5em;
	padding-right:0.5em;
	border-bottom: 0.3em solid transparent;
	/*
	height:1cm;
	*/
	width:1cm;
}
ul > li > span{
	font-size: 2em;
}
ul > li > h1{
	font-size: 50%;
}
ul > li.active{
	display: inline-block;
	border-bottom-color: orange;
	border-bottom-color: var(--main-highlight);
}
		`;
	}
}



window.customElements.define('ps-tabpanel',psTabbedPanelElement);
try{
	/* global Vue */
	if(Vue && !Vue.config.ignoredElements.includes('ps-tabpanel')){
		Vue.config.ignoredElements.push('ps-tabpanel');
	}
}
catch(err){}
