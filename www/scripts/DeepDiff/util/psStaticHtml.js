'use strict';

/*
global Document
global EventTarget
*/

export default class psStaticHtml extends EventTarget{
	constructor(){
		super();
		this._ = {
			dom: new Document(),
			charts: {},
			handler: ()=>{}
		};
	}

	get dom(){
		return this._.dom;
	}

	get MISS(){
		let miss = this._.miss;
		return miss;
	}
	set MISS(value){
		if(this._.miss === value){
			return;
		}
		if(this._.miss){
			this._.miss.removeEventListener('change',this._.handler);
			this._.miss.removeEventListener('load',this._.handler);
		}
		this._.miss = value;
		this._.miss.addEventListener('change',this._.handler);
		this._.miss.addEventListener('load',this._.handler);
	}

	get charts(){
		return this._.charts;
	}

	async BuildDoc(){
		let vis = Object
			.entries(this.charts)
			//.filter(d=>{return d[0] === 'Comparisons';})
			.map(async (d)=>{
				let html = ''
				if(d[1].html){
					html = await d[1].html();
				}
				else{
					html = d[1].innerHTML;
				}
				html = "<h2>" + d[0] + "</h2>\n" + html;
				return html;
			})
			;
		vis = await Promise.all(vis);
		vis = vis.join('\n')
			;
		let content = [
			'<html>',
			'<head>',
			' <meta charset="utf-8" />',
			' <title>{{title}}</title>',
			' <style>{{css}}</style>',
			'</head>',
			'<body>',
			' <h1>{{title}}</h1>',
			' <pre>',
			'  {{datetime}}',
			'  Produced by <a href="'+window.location+'">MISS</a>',
			' </pre>',
			'{{vis}}',
			'</body>',
			'</html>'
		];
		content = content.join('\n');
		content = content
			.replace(/{{title}}/g,this.MISS.Title)
			.replace(/{{datetime}}/g,(new Date()).toISOString())
			.replace(/{{css}}/g,this.CSS)
			.replace(/{{vis}}/g,vis)
			;
		return content;
	}

	get CSS(){
		return psStaticHtml.CSS;
	}

	static get CSS(){
		let css = Array.from(document.styleSheets);
		css = css.map(sheet=>{
			let rules = null;
			try{
				rules = Array.from(sheet.rules)
					.filter(rule=>{
						if(!rule.styleSheet) return true;
						if(rule.styleSheet.ownerRule instanceof CSSImportRule) return false;
						return true;
					})
					.map(rule=>{
						let css = rule.cssText;
						return css;
					})
					;
				rules = rules.join('\n');
			}
			catch(e){ // if e instanceof DOMException){
				console.debug(e);
				rules = '';
			}
			return rules;
		});
		css = css.join('\n');
		return css;
	}
}
