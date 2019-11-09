'use strict';

/*
global _
global HTMLElement
*/

export default class psSimilarityMap extends HTMLElement {
	constructor(deepdiff){
		super();
		this._ = {result:null,deepdiff:deepdiff};
		this.attachShadow({mode: 'open'});
	}

	get isShow(){
		return !(this.submission.visible === false);
	}

	get showhideIcon(){
		if(this.isShow){
			return icons.visibility;
		}
		return icons.visibility_off;
	}

	get flip(){
		return this._.flip == true;
	}
	set flip(value){
		value = value == true;
		this._.flip = value;
	}
	get result(){
		return this._.result;
	}
	set result(value){
		value = value || null;
		if(this._.result && value && this._.result.name === value.name) return;

		let elems = Array.from(this.shadowRoot.querySelectorAll('article'));
		elems.forEach(e=>{ e.innerHTML = ''; });
		this._.result = value;
		this.Render();
	}

	get DeepDiff(){
		return this._.deepdiff;
	}

	showhide(event){
		// only explicit false is 'false' ... everything else is to be
		// assumed 'true'. Also, toggle it.
		let value = (this.submission.visible === false);
		// set it on the object
		this.submission.visible = value;
		return value;
	}

	async Render(){
		let panel = this.shadowRoot;
		panel.innerHTML =
			'<style>'+
			this.InitialCss+
			'</style>'+
			this.Template
			;
		if(!this.result) return;

		let subNames = this.result.submissions.map(sub=>{return sub.name;});
		let elems = Array.from(this.shadowRoot.querySelectorAll('article'));
		let submissions = await this.DeepDiff.Submissions;
		submissions = submissions
			.filter((sub)=>{
				return subNames.includes(sub.name);
			})
			;
		if(this.flip){
			submissions.reverse();
		}
		for(let i=0; i<2; i++){
			let chains = JSON.clone(this.result.chains.slice(0,this.PalletteSize-1))
				.map((d)=>{
					return d.submissions[i].map((s)=>{
						s.chain = d.id;
						return s;
					});
				})
				.reduce((a,d)=>{
					for(let i of d){
						a[i.path] = a[i.path] || [];
						a[i.path].push(i);
					}
					return a;
				},{})
				;
			for(let seg of Object.values(chains)){
				seg.sort((a,b)=>{return a.start-b.start;});
			};

			let submission = submissions[i];
			let element = elems[i];
			for(let section in submission.content){
				let content = submission.content[section];
				let header = document.createElement('details');
				let body = document.createElement('pre');
				header.innerHTML = [
					`<summary>${content.name}</summary>`,
					'<ul>',
					//` <li>${content.name}</li>`,
					` <li>${content.relativePath}</li>`,
					` <li>${content.type}</li>`,
					'</ul>',
				].join('\n');

				let segments = chains[section] || [];
				let range = {
					start: content.blob.length-1,
					path: section
				};
				for(let seg = segments.pop() ; seg; seg = segments.pop()){
					seg.end++;
					let span = document.createTextNode('');
					range.end = range.start;
					range.start = seg.end;
					span.textContent = submission.fetchSegment(range);
					body.prepend(span);
					span = document.createElement('span');
					span.textContent = submission.fetchSegment(seg);
					span.dataset.chain = seg.chain;
					body.prepend(span);
					range = seg;
				}
				let span = document.createTextNode('');
				range.end = range.start;
				range.start = 0;
				span.textContent = submission.fetchSegment(range);

				body.dataset.file = section;
				element.append(header);
				element.append(body);
			}

		}

		let pallette = this.shadowRoot.querySelector('ul');
		pallette.innerHTML = '';
		let chainsize = Math.min(this.result.chains.length, this.PalletteSize);
		for(let i=1; i<chainsize; i++){
			let li = document.createElement('li');
			li.dataset.chain = i;
			li.innerHTML = '&#9679;';
			pallette.append(li);
		}
	}

	get Template(){
		return psSimilarityMap.Template;
	}
	static get Template(){
		return`
  <ul></ul>
  <article></article><article></article>
		`;
	}

	get PalletteSize(){
		return psSimilarityMap.PalletteSize;
	}

	static get PalletteSize(){
		return 9;
	}

	get InitialCss(){
		return psSimilarityMap.InitialCss;
	}

	static get InitialCss(){
		let pallette = new Array(this.PalletteSize)
			.fill(0)
			.map((d,i)=>{
				return `*[data-chain='${i}']{background-color:var(--data-pallette-${i});}`
			})
			.join('\n');
		return`
article {
	position:relative;
	display:inline-block;
	width:49%;
	margin:0;
	border:1px solid darkgray;
	overflow:auto;
	vertical-align: top;
}
article:last-of-type{
	border-left:0;
}
article > pre {
	display:block;
	font-size:0.8em;
	padding:1em;
}
article > pre > span[data-chunk]{
	background-color:var(--data-pallette-0);
}
${pallette}
details{
	border-bottom:1px solid darkgray;
}
ul{
	list-style:none;
}
:host > ul {
	color:rgba(255,255,255,0);
	font-size:0.75em;
	margin-top:0;
	padding-top:0;
}
:host > ul > li{
	border:0.1em solid darkgray;
	display:inline-block;
	position:relative;
	width:1em;
	height:1em;
	border-radius:0.55em;
	text-align:center;
}
		`;
	}
}

window.customElements.define('ps-similaritymap',psSimilarityMap);

try{
	/* global Vue */
	if(Vue){
		if(!Vue.config.ignoredElements.includes('ps-similaritymap')){
			Vue.config.ignoredElements.push('ps-similaritymap');
		}
	}
}
catch(err){}
