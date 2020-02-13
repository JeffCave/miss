'use strict';

//import * as Bowser from 'https://cdnjs.cloudflare.com/ajax/libs/bowser/1.9.4/bowser.js';

export default class BrowserCheck{
	constructor(){

	}

	static get browser(){
		/*
		if(BrowserCheck._bowser){
			return BrowserCheck._bowser;
		}
		BrowserCheck._bowser = Bowser.getParser(window.navigator.userAgent);
		return BrowserCheck._bowser;
		*/
		let agent = window.navigator.userAgent;
		let geckoTest = /firefox/i;
		if(geckoTest.test(agent)){
			return "gecko";
		}
		return "other";
	}

	static get Tests(){
		return {
			'Modules': ()=>{
				return true;
			},
			'WebWorkers':()=>{
				return (typeof window.Worker !== 'undefined');
			},
		};
	}

	static get isCompatible(){
		if(BrowserCheck.CompatCheckOff){
			return true;
		}
		let results = BrowserCheck.RunTests();
		results = results.every(r=>r.result);
		return results;
	}

	static get CompatCheckOff(){
		let pairs = window.location.search.split('?')[1] || '';
		pairs = pairs.split('&');
		let flag = pairs.some((param)=>{
			let pair = param.split('=');
			let key = pair.shift();
			if(key !== 'CompatCheck'){
				return false;
			}
			let val = pair.join('=');
			return val === 'wimp';
		});
		return flag;
	}

	static RunTests(){
		if(BrowserCheck.results){
			return BrowserCheck.results;
		}
		BrowserCheck.results = Object.entries(BrowserCheck.Tests).map(d=>{
			let name = d[0];
			let result = false;
			try{
				result = d[1]() == true;
			}
			catch(e){
				result = false;
			}
			return {name:name,result:result};
		})
		;
		return BrowserCheck.results;
	}

	static ResultsToHTML(results=null){
		if(!results){
			results = BrowserCheck.RunTests();
		}
		let html = results.map((result)=>{
			return [
					'<li class="',result.result ? 'pass' : 'fail','">',
					' ',
					result.name,
					'</li>'
				].join('');
		}).join('');
		return html;
	}

	static get CSS(){
		return `
 ul.results li.wait::before{
  font-size:1em;color:black;content:"?";padding-right:0.5em;
 }
 ul.results li.fail::before{
  font-size:1em;color:darkred;content:"\\2612";
 }
 ul.results li.pass::before{
  font-size:1em;color:darkgreen;content:"\\2611";
 }
		`;
	}
}

window.BrowserCheck = BrowserCheck;
