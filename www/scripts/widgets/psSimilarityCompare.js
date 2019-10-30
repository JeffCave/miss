'use strict';

/*
global _
global HTMLElement
*/

import psSimilarityMap from './psSimilarityMap.js';

export default class psSimilarityCompare extends HTMLElement{
	constructor(){
		super();

		this._ = {
			delay: 1000,
			handler: (e)=>{
				if(!e.detail){
					this.Render();
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


	get result(){
		return this._.resultSelector.value;
	}
	set result(value){
		let opt = this._.resultSelector.querySelector(`option[value='${name}']`);
		opt.selected = true;
	}


	get innerHTML(){
		let html = this._.shadow.innerHTML;
		//html = html.replace(/â–ˆ/g,this._.filler);
		return html;
	}

	get Render(){
		if(this._Render) return this._Render;

		let renderer = ()=>{
			this.shadowRoot.innerHTML =
				'<style>'+psSimilarityCompare.DefaultCss+'</style>' +
				psSimilarityCompare.Template
				;
			this._.resultSelector = this.shadowRoot.querySelector("select[name='results']");
			let display = new psSimilarityMap(this.DeepDiff);
			this.shadowRoot.append(display);
			this._.resultSelector.addEventListener('change',async ()=>{
				let results = this.DeepDiff.report.results[this.result];
				if(results){
					results = await this.DeepDiff.Results
					let result = results
						.filter((d)=>{
							return d.name === this.result;
						})
						.pop()
						;
					display.result = result;
				}
			});

			if(this.DeepDiff){
				let results = Object.values(this.DeepDiff.report.results);
				for(let result of results){
					this.add(result);
				}
				this._.resultSelector.dispatchEvent(new Event('change'));
			}

		};

		this._Render = _.throttle(renderer,this._.delay);
		return this._Render;
	}

	add(result){
		let opt = document.createElement('option');
		opt.value = result.name;
		opt.innerText = result.name;
		this._.resultSelector.append(opt);
	}

	remove(result){
		let name = result.name;
		let opt = this._.resultSelector.querySelector(`option[value='${name}']`);
		opt.remove();
	}

	connectedCallback(){
		this.Render();
	}

	static get DefaultCss(){
		return `
		`;

	}

	static get Template(){
		return `
<fieldset>
<label>Comparison</label>
<select name='results'></select>
</fieldset>
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
