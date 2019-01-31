'use strict';

/*
global _
global HTMLElement
*/

export default class psMatrixMap extends HTMLElement{
	constructor(){
		super();

		this._ = {
			unwatch: ()=>{},
			results:{
				results:{},
				submissions:{},
				archives:[],
			},
			delay:2000,
		};

		let shadow = this.attachShadow({mode: 'open'});
		shadow.innerHTML = '<style>'+psMatrixMap.DefaultCss+'</style>';
		let table = document.createElement('table');
		this._.thead = document.createElement('thead');
		table.append(this._.thead);
		this._.thead.append(document.createElement('tr'));
		this._.thead = this._.thead.children[0];
		this._.thead.append(document.createElement('th'));
		this._.tbody = document.createElement('tbody');
		shadow.append(table);
		table.append(this._.tbody);
	}

	get report(){
		return this._.results;
	}
	set report(value){
		this._.unwatch();
		// Need to do this with a proxy
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
		this._.results = value;
		this._.results.$watch('results',(newval,oldval)=>{
			this.monitorResults(newval,oldval);
		},{immediate:true,deep:true});
	}


	monitorResults(newval,oldval){
		this.Render();
	}

	RenderResult(result){

	}

	get Render(){
		if(this._Render) return this._Render;

		let renderer = ()=>{
			let submissions = this.orderedSubmissions();
			let body = this._.tbody;
			let header = this._.thead;

			while(header.cells.length < submissions.length+1){
				let cell = document.createElement('th');
				cell.innerHTML = '<span>&nbsp;</span>';
				header.append(cell);
			}
			while(header.cells.length > submissions.length+1){
				let cell = Array.from(header.cells).pop();
				cell.parentElement.removeChild(cell);
			}

			while(body.rows.length < submissions.length){
				let row = document.createElement('tr');
				row.innerHTML = '<th>&nbsp;</th>';
				body.append(row);
			}
			while(body.rows.length > submissions.length){
				let row = Array.from(body.rows).pop();
				row.parentElement.removeChild(row);
			}

			submissions.forEach((a,r)=>{
				let row = body.rows[r];
				while(row.cells.length < submissions.length+1){
					let cell = document.createElement('td');
					cell.innerHTML = '<span title="" >&#9608;</span>';
					row.append(cell);
				}
				while(row.cells.length > submissions.length+1){
					let cell = Array.from(row.cells).pop();
					row.removeChild(cell);
				}
				header.cells[r+1].children[0].textContent = a.name;
				row.cells[0].textContent = a.name;
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
					}
					else if(result){
						settings.title = (result.percentMatched * 100).toFixed(1) + '% ';
						if(result.complete !== result.totalTokens && result.totalTokens > 0){
							settings.style = 'active';
							settings.title += ' complete';
							this.Render();
						}
						else{
							settings.opacity = result.percentMatched;
							settings.title += ' similar';
							if(this.report.isSignificantResult(result)){
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
		let submissions = Object.values(this.report.submissions);
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
		let result = this.report.results[key];
		return result;
	}

	static get DefaultCss(){
		return `

table {
	background-color: transparent;
	margin: 1em;
	border-collapse:collapse;
}
thead th, thead th > span {
	background-color: transparent;
	writing-mode: vertical-rl;
	text-align:right;
}

tbody {
}

td > span{
	display:block;
	font-size: 3em;
	height: 1.5em;
	width: 1.5em;
	position: absolute;
	overflow: hidden;
	border: 1px solid black;
	top: -0.25em;
	left: -0.1em;
}

td, td.complete {
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

td.active{
	color: orange;
	color: var(--notice-warn-high);

	transition: opacity 1s, color 1s;
}

td.significant{
	color: darkred;
	color: var(--notice-fail-high);
}

td.complete{
	color: black;
	color: var(--notice-info-high);
}
		`;

	}
}


window.customElements.define('ps-matrixmap',psMatrixMap);
/* global Vue */
if(Vue && !Vue.config.ignoredElements.includes('ps-matrixmap')){
	Vue.config.ignoredElements.push('ps-matrixmap');
}
