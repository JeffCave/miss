'use strict';

import * as util from '../DeepDiff/util/misc.js';

/*
global _
global HTMLElement
*/

export default class psMatrixMap extends HTMLElement{
	constructor(){
		super();

		this._ = {
			results:{
				results:{},
				submissions:{},
				archives:[],
			},
			handler: (e)=>{
				this.Render();
			},
			delay:1000,
			filler:'&#9608;',
		};

		let shadow = this.attachShadow({mode: 'open'});
		this._.shadow = shadow;
		shadow.innerHTML = '<style>'+psMatrixMap.DefaultCss+'</style>';
		let table = document.createElement('table');
		table.classList.add('matrixmap');
		this._.thead = document.createElement('thead');
		table.append(this._.thead);
		this._.thead.append(document.createElement('tr'));
		this._.thead = this._.thead.children[0];
		this._.thead.append(document.createElement('th'));
		this._.tbody = document.createElement('tbody');
		shadow.append(table);
		table.append(this._.tbody);
	}

	get DeepDiff(){
		return this._.results;
	}
	set DeepDiff(value){
		if(this._.results !== value){
			if(this._.results.removeEventListener){
				this._.results.removeEventListener('results',this._.handler);
				this._.results.removeEventListener('load',this._.handler);
			}
			this._.results = value;
			this._.results.addEventListener('results',this._.handler);
			this._.results.addEventListener('load',this._.handler);
			this.Render();
		}
	}

	get innerHTML(){
		let html = this._.shadow.innerHTML;
		//html = html.replace(/â–ˆ/g,this._.filler);
		return html;
	}

	get Render(){
		if(this._Render) return this._Render;

		let renderer = ()=>{
			let submissions = this.orderedSubmissions();
			let body = this._.tbody;
			let header = this._.thead;
			let isChanged = false;

			while(header.cells.length < submissions.length+1){
				let cell = document.createElement('th');
				cell.innerHTML = '<span>&nbsp;</span>';
				header.append(cell);
				isChanged = true;
			}
			while(header.cells.length > submissions.length+1){
				let cell = Array.from(header.cells).pop();
				cell.parentElement.removeChild(cell);
				isChanged = true;
			}

			while(body.rows.length < submissions.length){
				let row = document.createElement('tr');
				row.innerHTML = '<th>&nbsp;</th>';
				body.append(row);
				isChanged = true;
			}
			while(body.rows.length > submissions.length){
				let row = Array.from(body.rows).pop();
				row.parentElement.removeChild(row);
				isChanged = true;
			}
			if(isChanged){
				let paths = submissions.map((s)=>s.name);
				this._.commonPath = util.CommonLead(paths,'/');
			}

			submissions.forEach((a,r)=>{
				let name = a.name.substr(this._.commonPath.length);
				let row = body.rows[r];
				while(row.cells.length < submissions.length+1){
					let cell = document.createElement('td');
					cell.innerHTML = '<span title="" >&#9608;</span>';
					row.append(cell);
					let span = document.querySelector('span');
					cell.addEventListener('click',(e)=>{
						let result = e.currentTarget.dataset.result;
						if(result) this.dispatchEvent(new CustomEvent('select',{detail:result}));
					});
				}
				while(row.cells.length > submissions.length+1){
					let cell = Array.from(row.cells).pop();
					row.removeChild(cell);
				}
				header.cells[r+1].children[0].textContent = name;
				row.cells[0].textContent = name;
				submissions.forEach((b,c)=>{
					let cell = row.cells[c+1];
					let settings = {
						opacity: 1,
						style: 'complete',
						title: '0% complete'
					};
					let result = this.getResult(a,b);
					if(r===c){
						settings.title = '100% to itself';
						cell.dataset.result = '';
					}
					else if(result){
						cell.dataset.result = result.name;
						settings.title = (result.percentMatched * 100).toFixed(1) + '% ';
						if(result.complete !== result.totalTokens){
							settings.style = 'active';
							settings.title += ' complete';
							setTimeout(()=>{this.Render();},this._.delay);
						}
						else{
							settings.opacity = result.percentMatched;
							settings.title += ' similar';
							if(this.DeepDiff.isSignificantResult(result)){
								settings.style = 'significant';
							}
						}
					}

					cell.style.opacity = Math.min(settings.opacity, 1);
					cell.classList.add(settings.style);
					cell.children[0].setAttribute('title',settings.title);

				});
			});

		};

		this._Render = _.throttle(renderer,this._.delay);
		return this._Render;
	}

	orderedSubmissions(){
		let submissions = Object.values(this.DeepDiff.report.submissions);
		submissions.sort((a,b)=>{ return a.name.localeCompare(b.name); });
		return submissions;
	}

	getResultSubmission(subA,subB){
		let result = this.getResult(subA,subB);
		if(!result) return result;
		let submission = result.submissions
			.filter((s)=>{
				return s.name === subA.name;
			});
		return submission[0];
	}

	getResult(subA,subB){
		let key = [subA.name,subB.name].sort().join('.');
		let result = this.DeepDiff.report.results[key];
		return result;
	}

	static get DefaultCss(){
		return `

table.matrixmap {
	background-color: transparent;
	margin: 1em;
	border-collapse:collapse;
}
table.matrixmap thead th, table.matrixmap thead th > span {
	background-color: transparent;
	writing-mode: vertical-rl;
	text-align:right;
}

table.matrixmap tbody {
}

table.matrixmap td > span{
	display:block;
	font-size: 3em;
	height: 1.5em;
	width: 1.5em;
	position: absolute;
	overflow: hidden;
	border: 1px solid black;
	top: -0.25em;
	left: -0.1em;
	cursor: pointer;
}

table.matrixmap td, table.matrixmap td.complete {
	cursor:default;
	position: relative;
	text-align: left;
	vertical-align: middle;
	height:1em;
	width:1em;
	overflow: hidden;
	border:0px solid black;
	border-radius: 1em;

	color: black;
	color: var(--notice-info-high);
	border-color: black;
	--border-color: var(--notice-info-high);

	transition: opacity 1s, color 1s;
}

table.matrixmap td.active{
	color: orange;
	color: var(--notice-warn-high);

	transition: opacity 1s, color 1s;
}

table.matrixmap td.significant{
	color: darkred;
	color: var(--notice-fail-high);
}

table.matrixmap td.complete{
	color: black;
	color: var(--notice-info-high);
}
		`;

	}
}


window.customElements.define('ps-matrixmap',psMatrixMap);
try{
	/* global Vue */
	if(Vue && !Vue.config.ignoredElements.includes('ps-matrixmap')){
		Vue.config.ignoredElements.push('ps-matrixmap');
	}
}
catch(err){}
