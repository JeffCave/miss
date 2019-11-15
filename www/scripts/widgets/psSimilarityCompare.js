'use strict';

/*
global _
global HTMLElement
*/

import psSimilarityMap from './psSimilarityMap.js';

export default class psSimilarityCompare extends HTMLElement{
	constructor(){
		super();

		this._ = {};
		this._.delay = 1000;
		this._.result = localStorage.getItem("activecompare");
		this._.handler = (e)=>{
			if(!e.detail){
				this.Render();
				setTimeout(()=>{
					//this.Render();
					this.result = this._.result;
				},100);
			}
			else if(e.detail.id.startsWith('result.')){
				if(e.detail.deleted){
					this.remove(e.detail.doc);
				}
				else{
					this.add(e.detail.doc);
				}
			}
			else{
				try{
					throw new Error("Invalid data event: received a non-result event emitter");
				}
				catch(e){
					ga('send', 'exception', {
						'exFatal': false,
						'exDescription': e.message,
					});
				}
			}
		};

		this.attachShadow({mode: 'open'});
	}

	get DeepDiff(){
		return this._.deepdiff;
	}
	set DeepDiff(value){
		if(this._.deepdiff !== value){
			if(this._.deepdiff && this._.deepdiff.removeEventListener){
				this._.deepdiff.removeEventListener('results',this._.handler);
				this._.deepdiff.removeEventListener('load',this._.handler);
			}
			this._.deepdiff = value;
			this._.deepdiff.addEventListener('results',this._.handler);
			this._.deepdiff.addEventListener('load',this._.handler);

			this.Render();
		}
	}

	get isFlipped(){
		let a = [this.subA,this.subB].sort().join('.');
		let b = [this.subA,this.subB].join('.');
		return (a !== b);
	}
	get result(){
		let a = [this.subA,this.subB].sort().join('.');
		if(a === '.'){
			a = '';
		}
		return a;
	}
	set result(value){
		let result = this.DeepDiff.report.results[value];
		if(result){
			this.subA = result.submissions[0].name;
			this.subB = result.submissions[1].name;
		}
	}

	get subA(){
		return this._.subSelector[0].value;
	}
	set subA(value){
		let opt = this._.subSelector[0].querySelector(`option[value='${value}']`);
		if(!opt || opt.selected) return;

		opt.selected = true;
		this._.subSelector[0].dispatchEvent(new Event('change'));
	}
	get subB(){
		return this._.subSelector[1].value;
	}
	set subB(value){
		let opt = this._.subSelector[1].querySelector(`option[value='${value}']`);
		if(!opt || opt.selected) return;

		opt.selected = true;
		this._.subSelector[1].dispatchEvent(new Event('change'));
	}

	get Render(){
		if(this._Render) return this._Render;

		let renderer = ()=>{
			this.shadowRoot.innerHTML = psSimilarityCompare.Template;
			this._.subSelector = Array.from(this.shadowRoot.querySelectorAll("select[name='submission']"));
			let display = new psSimilarityMap(this.DeepDiff);
			this.shadowRoot.append(display);
			let selectorHandler = _.debounce(async ()=>{
				let r = this.result;
				let results = this.DeepDiff.report.results[r] || null;
				if(results){
					results = await this.DeepDiff.Results
					results = results
						.filter((d)=>{
							return d.name === r;
						})
						.pop()
						;
				}
				if(results){
					localStorage.setItem("activecompare", results.name);
				}
				display.flip = this.isFlipped;
				display.result = results;

			},10);
			Array.from(this._.subSelector).forEach((d)=>{
				d.addEventListener('change',selectorHandler);
			});

			if(this.DeepDiff){
				let results = Object.values(this.DeepDiff.report.results);
				for(let result of results){
					this.add(result);
				}
				this._.subSelector[0].dispatchEvent(new Event('change'));
			}

		};

		this._Render = _.throttle(renderer,this._.delay);
		return this._Render;
	}

	add(result){
		let submissions = result.submissions;
		for(let sub of submissions){
			let opt = document.createElement('option');
			opt.value = sub.name;
			opt.textContent = sub.name;
			let marker = null;
			Array.from(this._.subSelector[0].children).every((child)=>{
				if(opt.value === child.value){
					opt = null;
					return false; // terminate early
				}
				if(opt.value < child.value){
					marker = child;
				}
				return true;
			});
			if (opt) this._.subSelector[0].insertBefore(opt,marker);
		}
		this._.subSelector[1].innerHTML = this._.subSelector[0].innerHTML;
	}

	remove(result){
	}

	get innerHTML(){
		return this.html();
	}

	async html(){
		let results = Object.values(this.DeepDiff.report.results);
		let mapper = new psSimilarityMap(this.DeepDiff);
		let html = [];
		let css = '';
		for(let result of results){
			mapper.result = result;
			css = mapper.InitialCss;
			let h = await mapper.html();
			h = h.replace(css,'');
			let title = mapper.title;
			html.push(`<h3>${title}</h3>`);
			html.push(h);
		}
		html.push(`<style>${css}</style>`);
		html = html.join('\n');
		return html;
	}

	connectedCallback(){
		this.Render();
	}

	static get DefaultCss(){
		return `
:host > select {
	display:inline-block;
	width:49%;
}
		`;

	}

	static get Template(){
		return `
<link rel='stylesheet' href='style/main.css' />
<style>
${psSimilarityCompare.DefaultCss}
</style>
<label>Comparison</label>
<select name='submission'></select>
<select name='submission'></select>
		`;
	}
}


window.customElements.define('ps-similaritycompare',psSimilarityCompare);
try{
	/* global Vue */
	if(Vue && !Vue.config.ignoredElements.includes('ps-similaritycompare')){
		Vue.config.ignoredElements.push('ps-similaritycompare');
	}
}
catch(err){}
