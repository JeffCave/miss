'use strict';

import * as util from '../DeepDiff/util/misc.js';

/*
global _
global HTMLElement
*/

export default class psTornadoChart extends HTMLElement {
	constructor(){
		super();

		this._ = {
			results: {
				results:[],
				submission:[],
				archives:[]
			},
			rows:{},
			handler: (e)=>{
				this.ReSync();
			}
		};

		let shadow = this.attachShadow({mode: 'open'});
		this._.shadow = shadow;
		shadow.innerHTML = '<style>'+psTornadoChart.DefaultCss+'</style>';
		let table = document.createElement('table');
		table.classList.add('tornado');
		this._.tbody = document.createElement('tbody');
		shadow.append(table);
		table.append(this._.tbody);
	}

	get report(){
		console.warn("Deprecated: use 'psTornadoChart.DeepDiff' instead");
		return this._.results;
	}

	get DeepDiff(){
		return this._.deepdiff;
	}

	set DeepDiff(value){
		if(this._.deepdiff && this._.deepdiff.removeEventListener){
			this._.deepdiff.removeEventListener('results',this._.handler);
			this._.deepdiff.removeEventListener('load',this._.handler);
		}
		this._.deepdiff = value;
		this._.deepdiff.addEventListener('results',this._.handler);
		this._.deepdiff.addEventListener('load',this._.handler);
		this.ReSync();
	}

	get innerHTML(){
		let html = this._.shadow.innerHTML;
		return html;
	}


	/**
	 * Syncronizes the objects we are movign around the screen with their
	 * underlying objects.
	 */
	get ReSync(){
		if(this._ReSync) return this._ReSync;

		let self = this;
		function RowClickHandler(e){
			let result = e.currentTarget.dataset.result;
			self.dispatchEvent(new CustomEvent('select',{detail:result}));
		}

		let syncer = function(){
			let results = this.ordered();
			let body = this._.tbody;

			let isChanged = false;
			while(body.rows.length < results.length){
				let row = document.createElement('tr');
				let cell = "<td><meter min='0' max='1' value='0' title=''></meter><span></span></td>";
				row.innerHTML = [cell,cell].join('');
				body.append(row);
				isChanged = true;
				row.addEventListener('click',RowClickHandler);
			}
			while(body.rows.length > results.length){
				let row = Array.from(body.rows).pop();
				row.parentElement.removeChild(row);
				isChanged = true;
			}
			if(isChanged){
				let paths = [];
				for(let r in results){
					let result = results[r];
					for(let s in result.submissions){
						let submission = result.submissions[s];
						paths.push(submission.name);
					}
				}
				this._.commonPath = util.CommonLead(paths,'/');
			}

			results.forEach((result,r)=>{
				let row = body.rows[r];
				if(result.complete === result.totalTokens){
					row.classList.add('complete');
					if(this.DeepDiff.isSignificantResult(result)){
						row.classList.add('significant');
					}
				}
				row.dataset.result = result.name;

				// update the cells
				result.submissions.forEach((submission,i)=>{
					let meter=row.cells[i].children[0];
					let title=row.cells[i].children[1];
					meter.value = submission.percentMatched;
					meter.title = psTornadoChart.formatTitle(submission.percentMatched);
					title.title = meter.title;
					title.textContent = submission.name.substr(this._.commonPath.length);
				});
			});
		};

		this._ReSync = _.throttle(syncer,1000);
		return this._ReSync;
	}

	static compareResults(a,b){
		let order = 0;
		if(order === 0){
			let bp = (b.complete === b.totalTokens)?1:0;
			let ap = (a.complete === a.totalTokens)?1:0;
			order = bp - ap;
		}
		if(order === 0){
			order = b.percentMatched - a.percentMatched;
		}
		if(order === 0){
			order = a.name.localeCompare(b.name);
		}
		return order;
	}

	ordered(){
		let list = Object.values(this.DeepDiff.report.results);
		list.sort(psTornadoChart.compareResults);
		return list;
	}

	static formatPct(pct){
		pct = pct * 100;
		pct = pct.toFixed(0);
		return pct;
	}

	static formatTitle(pct){
		let label = '% similarity';
		pct = psTornadoChart.formatPct(pct);
		pct = [pct, label];
		pct = pct.join('');
		return pct;
	}

	static get DefaultCss(){
		let css = `
table.tornado{
	width: calc(100% - 1em);
	max-width: 300px;
	border-collapse: collapse;
	border: 0;
	margin: 1em;
}
table.tornado thead {
	display: none;
}
table.tornado tbody {
	border:0;
}
table.tornado tr:hover {
	cursor:pointer;
}
table.tornado td {
	border: 0;
	padding: 0;
	margin: 0;
	position: relative;
	width: 50%;
	font-family: sans-serif;
	vertical-align: middle;
}

table.tornado tr > td > meter {
	width: 100%;
	height: 1.25em;
	background: lightgray;
	background: var(--notice-pending-low);
	transition: all 0.5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr > td > meter::-webkit-meter-bar {
	background: lightgray;
	background: var(--notice-pending-low);
	transition: all 0.5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr > td > meter::-webkit-meter-optimum-value{
	background: darkgray;
	background: var(--notice-pending-high);
	border-top-right-radius: 0.5em;
	border-bottom-right-radius: 0.5em;
	transition: all 0.5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr > td > span {
	position: absolute;
	left: 0.5em;
	color: white;
	font-weight: bold;
	z-index: 10;
	height: 1.25em;
	vertical-align: middle;
	padding: 0.15em;
}

table.tornado tr > td:nth-of-type(1) {
	border-right: 0.1em solid white;
	border-right-color: darkgray;
	border-right-color: var(--notice-pending-high);
}
table.tornado tr > td:nth-of-type(1) > meter {
	transform: rotate(180deg);
}
table.tornado tr > td:nth-of-type(1) > span {
	right: 0.5em;
}

table.tornado tr.complete > td > meter {
	background: lightsteelblue;
	background: var(--notice-info-low);
	transition: all 5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr.complete > td > meter::-webkit-meter-bar {
	background: lightsteelblue;
	background: var(--notice-info-low);
	transition: all 5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr.complete > td > meter::-webkit-meter-optimum-value{
	border: 0;
	background: steelblue;
	background: var(--notice-info-high);
	transition: all 5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr.complete > td:nth-of-type(1) {
	border-right-color: steelblue;
	border-right-color: var(--notice-info-high);
	transition: all 5s ease-in-out;
}

table.tornado tr.significant > td > meter{
	background: lightsalmon;
	background: var(--notice-fail-low);
	transition: all 5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr.significant > td > meter::-webkit-meter-bar {
	background: lightsalmon;
	background: var(--notice-fail-low);
	transition: all 5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr.significant > td > meter::-webkit-meter-optimum-value{
	border:0;
	background: darkred;
	background: var(--notice-fail-high);
	transition: all 5s ease-out;
	-webkit-print-color-adjust: exact;
}
table.tornado tr.significant > td:nth-of-type(1) {
	border-right-color: darkred;
	border-right-color: var(--notice-fail-high);
	transition: all 5s ease-in-out;
}
table.tornado tr.deleting{
	opacity:0.1;
	height:1px;
	transition:
		opacity 1s,
		height 1s;
}
table.tornado tr.deleting > td{
	position:relative;
	height:1px;
	transition:
		opacity 1s,
		height 1s;
}
		`;
		if(window.BrowserCheck.browser === 'gecko'){
			//css = css.replace(/-webkit-/g,'-moz-');
			css = css
				.replace(/:-webkit-meter-bar/g,':-moz-meter-bar')
				.replace(/:-webkit-meter-optimum-value/g,'-moz-meter-optimum::-moz-meter-bar')
				;
		}
		return css;
	}


}


window.customElements.define('ps-tornadochart',psTornadoChart);
try{
	/* global Vue */
	if(Vue && !Vue.config.ignoredElements.includes('ps-tornadochart')){
		Vue.config.ignoredElements.push('ps-tornadochart');
	}
}
catch(err){}
