'use strict';

import 'https://unpkg.com/jepub/dist/jepub.js';

/*
global Document
global EventTarget
global jEpub
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

	BuildDoc(){
		let date = new Date();

		let desc = [
				'<pre>',
				' {{datetime}}',
				' Produced by <a href="'+window.location+'" title="Measure of Integrity of Submissions of Students">MISS</a>',
				'</pre>',
			]
			.join('\n')
			.replace(/{{datetime}}/g,date.toISOString().substr(0,10))
			;
		let epub = new jEpub({
			i18n: 'en', // Internationalization
			title: this.MISS.Title,
			author: 'Book author',
			//publisher: 'Produced by <a href="'+window.location+'">Measure of Integrity of Submissions of Students</a>',
			publisher: 'Measure of Integrity of Submissions of Students',
			description: desc, // optional
			tags: ['miss','students', 'similarity', 'report' ] // optional
		});
		epub.date(new Date());
		epub.uuid(this.MISS.report.hash);
		//epub.cover(buffer: object)
		//epub.notes(content: string)
		Object.entries(this.charts).forEach((d)=>{
			let key = d[0];
			let html = ['<style>',this.CSS,'</style>',d[1].innerHTML].join('');
			epub.add(key, html);
		});
		epub = epub.generate('blob');
		return epub;
	}

	get CSS(){
		return psStaticHtml.CSS;
	}

	static get CSS(){
		return `
:root{
	--main-color: rgb(36, 142, 194);
	--main-color-contrast: white;
	--main-highlight: var(--notice-info-low);
	--corners:0.25em;

	--notice-info-off:whitesmoke;
	--notice-info-low:lightsteelblue;
	--notice-info-high:steelblue;

	--notice-fail-off:mistyrose;
	--notice-fail-low:lightsalmon;
	--notice-fail-high:darkred;

	--notice-warn-off:gold;
	--notice-warn-low:orange;
	--notice-warn-high:orangered;

	/*
	--notice-pass-off:mistyrose;
	--notice-pass-low:lightsalmon;
	--notice-pass-high:darkred;
	*/
	--notice-pending-off:white;
	--notice-pending-low:lightgray;
	--notice-pending-high:darkgray;

	/*
	 https://www.mulinblog.com/a-color-palette-optimized-for-data-visualization/
	*/
	--data-pallette-0: #4d4d4d; /* grey   */
	--data-pallette-1: #5da5da; /* blue   */
	--data-pallette-2: #faa43a; /* orange */
	--data-pallette-3: #60bd68; /* green  */
	--data-pallette-4: #f17cb0; /* pink   */
	--data-pallette-5: #b2912f; /* brown  */
	--data-pallette-6: #b276b2; /* purple */
	--data-pallette-7: #decf3f; /* yellow */
	--data-pallette-8: #f15854; /* red    */
}
		`;
	}
}
