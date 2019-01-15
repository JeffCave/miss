'use strict';
export {
	psPanelElement
};

import icons from './icons.js';

export default class psPanelElement extends HTMLElement {
	constructor() {
		super();

		this.classList.add('restore');

		let panel = this.attachShadow({mode: 'open'});

		let style= document.createElement('style');
		panel.append(style);
		style.textContent = this.initialCSS;

		this.domIcon = document.createElement('span');
		panel.append(this.domIcon);
		this.domIcon.setAttribute('name','icon');
		this.domIcon.style.cursor = 'default';
		this.domIcon.innerHTML =
			icons[this.icon] ||
			this.icon.split().shift() ||
			'&nbsp;'
			;

		this.domMaximize = document.createElement('span');
		panel.append(this.domMaximize);
		let btn = this.domMaximize;
		btn.classList.add('resizer');
		btn.setAttribute('name','maximize');
		btn.innerHTML = '&#128470;';
		btn.addEventListener('click',(e)=>{
			this.maximize();
			e.stopPropagation();
		});

		this.domRestore = document.createElement('span');
		panel.append(this.domRestore);
		btn = this.domRestore;
		btn.setAttribute('name','restore');
		btn.innerHTML = '&#128471;';
		btn.addEventListener('click',(e)=>{
			this.restore();
			e.stopPropagation();
		});

		this.domMinimize = document.createElement('span');
		panel.append(this.domMinimize);
		btn = this.domMinimize;
		btn.setAttribute('name','minimize');
		btn.innerHTML = '&#128469;';
		btn.addEventListener('click',(e)=>{
			this.minimize();
			e.stopPropagation();
		});

		let slot = document.createElement('slot');
		panel.append(slot);

		this.state =  this.getAttribute('state');
		this[this.state]();
	}

	get icon(){
		let i = this.getAttribute('icon');
		return i || '';
	}

	set icon(value){
		this.setAttribute("icon", value);
	}

	get summary(){
		let h1 = this.querySelector('h1');
		let summary = this.domIcon.outerHTML + h1.outerHTML;
		return summary;
	}

	minimize(){
		this.classList.add('minimize');
		this.classList.remove('maximize');
		this.classList.remove('hide');
		this.addEventListener('click',psPanelElement.restorePanel);
		//this.domIcon.addEventListener('click',psPanelElement.restorePanel);
	}

	restore(){
		this.normal();
		console.warn('Use "normal" instead');
	}
	normal(){
		this.classList.add('restore');
		this.classList.remove('minimize');
		this.classList.remove('maximize');
		this.classList.remove('hide');
		this.removeEventListener('click',psPanelElement.restorePanel);
		//this.domIcon.removeEventListener('click',psPanelElement.restorePanel);
	}

	hide(){
		this.classList.add('hide');
		this.classList.remove('maximize');
		this.classList.remove('minimize');
		this.addEventListener('click',psPanelElement.restorePanel);
		//this.domIcon.addEventListener('click',psPanelElement.restorePanel);
	}

	maximize(){
		this.restore();
		this.classList.add('maximize');
	}

	get state(){
		return this.getAttribute('state') || 'normal';
	}

	set state(value){
		const allowed = ['normal','maximize','minimize','hide'];
		let orig = this.state;

		value = (value || '');
		value = value.toLowerCase();
		if(!allowed.includes(value)){
			value = 'normal';
		}

		this.setAttribute('state',value);
		if(value !== orig){
			this[this.state]();
		}
	}

	static restorePanel(e){
		e.target.restore();
	}

	get initialCSS(){
		return `
@charset 'utf-8';
:host{
	display:block;
	position:relative;
	color:inherit;
	background-color:var(--main-color-contrast);
	border:0.1em solid;
	border-radius:0.3em;
}

[name='minimize'], [name='maximize'], [name='restore']{
	float: right;
	zIndex: 1000;
	cursor: default;
	textShadow: 0 0 1px white;
}

:host(.restore){
	transition:
		min-width 1s,
		max-width 1s,
		min-height 1s,
		max-height 1s,
		height 1s,
		width 1s,
		opacity 1s,
		visibility 0.9s
		;
}
:host(.restore) > *{
	transition: opacity 1s,visibility 1s;
}
:host(.restore) > span[name='restore']{
	display:none;
}
:host(.restore) > span[name='maximize']{
	display:inline;
}
:host(.restore) > span[name='minimize']{
	display:inline;
}

:host(.minimize){
/*
	--total-border:calc(var(border-width)*2 - var(margin-left) - var(margin-right) - var(padding-left) - var(padding-right));
	min-width:calc(1cm - var(--total-border));
*/
	min-width:1cm;
	max-width:1cm;
	min-height:1cm;
	max-height:1cm;
	overflow:hidden;
	transition:
		min-width 1s,
		max-width 1s,
		min-height 1s,
		max-height 1s
		;
	transition-timing-function: cubic-bezier;
	display:flex;
	align-items: center;
	justify-content: center;
}

:host(.minimize) > *{
	visibility: hidden;
	opacity: 0;
	transition: opacity 1s, visibility 0.9s;
}


:host(.maximize) > span[name='maximize']{
	display:none;
}
:host(.maximize) > span[name='restore']{
	display:inline;
}
:host(.maximize) {
	/* position:fixed !important; */
	position:absolute !important;
	z-index:1000;
	top:0;
	bottom:0;
	right:0;
	left:0;
	background-color:var(--main-color-contrast);
}


:host(.minimize) > span[name='icon'] {
	opacity:1;
	position:absolute;
	visibility:visible;
	transition: opacity 1s,visibility 1s;
	font-size: 0.75cm;
}

		`;
	}

}



window.customElements.define('ps-panel',psPanelElement);
/* global Vue */
if(Vue && !Vue.config.ignoredElements.includes('ps-panel')){
	Vue.config.ignoredElements.push('ps-panel');
}
