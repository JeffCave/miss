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

	get result(){
		return this._.result;
	}
	set result(value){
		if(!value) return;
		if(this._.result === value) return;

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

		let subNames = this.result.submissions.map(sub=>{return sub.name;});
		let elems = Array.from(this.shadowRoot.querySelectorAll('article'));
		let submissions = await this.DeepDiff.Submissions;
		let chainLabels = new Set();
		submissions = submissions
			.filter((sub)=>{
				return subNames.includes(sub.name);
			})
			;
		for(let i=0; i<2; i++){
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

				let block = null;
				let list = this.result.submissions[i].finalList.slice()
				let range = [content.blob.length-1,content.blob.length-1];
				let span = document.createTextNode('');
				body.prepend(span);
				for(let lex = list.pop() ; list.length > 0; lex = list.pop()){
					let share = lex.shared || null;
					if(share !== block){
						if(span){
							span.textContent = content.blob.substring(...range);
						}
						if(share){
							span = document.createElement('span');
							span.dataset.chain = share;
						}
						else {
							span = document.createTextNode('');
						}
						body.prepend(span);
						block = share;
						chainLabels.add(share);
						range[1] = range[0];
					}
					range[0] = lex.range[0];
				}
				range[0] = 0;
				span.textContent = content.blob.substr(...range);

				body.dataset.file = section;
				element.append(header);
				element.append(body);
			}

		}

		let pallette = this.shadowRoot.querySelector('ul');
		chainLabels.delete(null);
		for(let label of chainLabels.values()){
			let li = document.createElement('li');
			li.dataset.chain = label;
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

	get InitialCss(){
		return psSimilarityMap.InitialCss;
	}

	static get InitialCss(){
		let pallette = new Array(9)
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
ul {
	list-style:none;
	color:rgba(255,255,255,0);
	font-size:0.75em;
	margin-top:0;
	padding-top:0;
}
li{
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
