'use strict';

/*
global JSZip
global Blob
*/


import {DeepDiff} from './DeepDiff/DeepDiff.js';
import {Submission} from './DeepDiff/submission/Submission.js';
import * as unpack from './DeepDiff/util/unpack.js';
import {psFile} from './DeepDiff/util/psFile.js';
import psStaticHtml from './DeepDiff/util/psStaticHtml.js';
import psStaticEpub from './DeepDiff/util/psStaticEpub.js';
import {ContentHandlers} from './DeepDiff/submission/ContentHandlers.js';
import * as utils from './DeepDiff/util/misc.js';
import './browsercheck.js';


import './widgets/psAlert.js';
import './widgets/psFileDrop.js';
import './widgets/psForceDirected.js';
import './widgets/psMatrixMap.js';
import './widgets/psPanelElement.js';
import './widgets/psSimilarityCompare.js';
import './widgets/psSubmissions.js';
import './widgets/psTabbedPanelElement.js';
import './widgets/psTornadoChart.js';
import psSimilarityCompare from './widgets/psSimilarityCompare.js';

/*
global File
global saveAs
*/


/**
 * Parses DeepDiff' command-line options.
 *
 * TODO: Consider changing from a  class? Having as an instance variable would greatly simplify
 */
class indexPage {
	constructor() {
		if(indexPage.isExperimental){
			let style = document.createElement('style');
			style.innerHTML = '.experimental{display:inline-block;}';
			document.head.append(style);
		}

		this.runner = new DeepDiff();

		let deleteall = document.querySelector('#DeleteAll');
		let save = document.querySelector('#Download');
		let restore = document.querySelector('#Restore');
		let print = document.querySelector('#Print');
		deleteall.addEventListener('click',()=>{
			this.runner.Clear();
		});
		save.addEventListener('click',async ()=>{
			let json = await this.runner.Export();
			json = JSON.stringify(json);
			var zip = new JSZip();
			zip.file("db.json", json);
			let title = this.runner.Title;
			title += ".miss";
			await zip
				.generateAsync({type : "blob"})
				.then(function(content) {
					//content = window.btoa(content);
					saveAs(content, title);
				})
				;
		});
		restore.addEventListener('change', async (e)=>{
			let files = Array.from(e.target.files).map(f=>{
				return new File([f],f.name,{type:'application/zip'});
			});
			files = await unpack.unPack(files);
			let json = [];
			for(let f in files){
				f = files[f];
				f = new psFile(f);
				f = await f.read('text');
				json.push(f);
			}
			json = json.join('');
			json = JSON.parse(json);
			this.runner.Import(json);
		});
		print.addEventListener('click',async ()=>{
			let name = this.runner.Title + ".html";
			let html = new psStaticHtml();
			html.MISS = this.runner;
			html.charts['Force Directed'] = document.querySelector('#forcechart');
			html.charts['Relationship Listing'] = document.querySelector('#tornadochart');
			html.charts['Heatmap'] = document.querySelector('#matrixmap');
			html.charts['Comparisons'] = document.querySelector('#simcompare');
			html = await html.BuildDoc();
			//html = new Blob([html],{type:'text/html'});
			//window.saveAs(html,name);
			let win = window.open('','missprint');
			if(win){
				win.document.write(html);
				//win.print();
			}
			else{
				window.saveAs(html,name);
			}
		});
		let epub = document.querySelector('#Epub');
		epub.addEventListener('click',async ()=>{
			let name = this.runner.Title + ".epub";
			let html = new psStaticEpub();
			html.MISS = this.runner;
			html.charts['Force Directed'] = document.querySelector('#forcechart');
			html.charts['Relationship Listing'] = document.querySelector('#tornadochart');
			html.charts['Heatmap'] = document.querySelector('#matrixmap');
			html.charts['Comparisons'] = document.querySelector('#simcompare');
			html = await html.BuildDoc();
			window.saveAs(html,name);
		});

		Array.from(document.querySelectorAll('form[is="deepdiff-opts"]')).forEach(opts=>{
			opts.ddInstance = this.runner;
		});
		['#forcechart','#tornadochart','#matrixmap','#submissions','#simcompare'].forEach(async (selector)=>{
			let chart = document.querySelector(selector);
			chart.DeepDiff = this.runner;
			chart.addEventListener('select',(e)=>{
				let simcompare = document.querySelector('#simcompare');
				simcompare.result = e.detail;
				let tabs = document.querySelector('ps-tabpanel');
				tabs.activate('compare');
			});
		});

		/*
		let uploadSubmission = document.querySelector('#UploadSubmission');
		uploadSubmission.addEventListener('change', async (e)=>{
			let files = e.target.files;
			let folder = await this.FindFolderStart(files);
			let submission = new Submission(folder.name,folder.files);
			this.runner.addSubmissions(submission);
		});
		*/

		let uploadSubmissions = document.querySelector('#UploadSubmissions');
		uploadSubmissions.addEventListener('change', async (e)=>{
			let files = e.target.files;
			let folder = await this.FindFolderStart(files);
			folder.files = this.GroupFolders(folder.files, folder.name);
			let submissions = [];
			for(let key in folder.files){
				let values = folder.files[key];
				let submission = new Submission(key,values);
				submissions.push(submission);
			}
			this.runner.addSubmissions(submissions);
		});
	}


	GroupFolders(files,prefix='.'){
		prefix = prefix.split('/').join('/');
		let groups = {};
		Object.entries(files).forEach((file)=>{
			let name = file[0].split('/');
			file = file[1];
			let group = name.shift();
			group = [prefix,group].join('/');
			name = name.join('/');

			groups[group] = groups[group] || {};
			groups[group][name] = file;
		});
		return groups;
	}


	async FindFolderStart(files){
		files = await unpack.unPack(files);

		let values = files;
		for(let f in values){
			let file = values[f];
			let type = file.type;
			if(type === 'application/octet-stream'){
				let ext = file.name.split('.').pop();
				let handler = ContentHandlers.lookupHandlerByExt(ext);
				type = handler.mime;
				if(!type){
					type = 'text/plain';
					if(ContentHandlers.ignores.includes(ext)){
						type = 'application/octet';
					}
				}
			}
			let path = f.split('/'); path.pop(); path = path.join('/');
			file = new psFile(file, file.name, {type:type,relativePath:path});
			file = await file.toJSON();
			values[f] = file;
		}
		files = values;

		let name = utils.CommonLead(Object.keys(files),'/');
		files = Object.entries(files).reduce((a,d)=>{
			let key = d[0].substr(name.length);
			let value = d[1];
			a[key] = value;
			return a;
		},{});

		name = name.split('/');
		while(['.','file:',''].includes(name[0])){
			name.shift();
		}
		name = name.join('/');

		return {
			name: name,
			files: files
		};
	}

	static get isExperimental(){
		let exp = window
			.location
			.search
			.replace(/^\?/,'')
			.split('&')
			.some((d)=>{
				return d.toLocaleLowerCase().split('=')[0] === 'experimental';
			});
		return exp;
	}
	static set isExperimental(value){
		value = (value == true);
		if(value === this.experimental) return;

		let search = window.location.search.replace(/^\?/,'').split('&').map(d=>{return d.split('=')});
		search = search.filter(d=>{d[0] !== 'experimental'});
		search.push(['experimental',value.toString()]);
		search = search.map(d=>{return d.join('=')}).join('&');
		window.location.search = search;
	}



}



window.alert = (msg,type='info')=>{
	document.querySelector('ps-alert').display(type,msg);
};

window.addEventListener('load',async function(){
	if(!indexPage.isExperimental && !BrowserCheck.isCompatible){
		let message = `
<p>
It appears that there may be some browser compatibility issues.
</p>
<p>
For more information, please check the <a href='./browsercheck.html'>browser compatibility page</a>. It has useful information on configuration changes you can make to your browser to get access to some experimental browser features.
</p>
<p>
Alternately, you can <a href='?CompatCheck=wimp'>just proceed</a> &hellip; nothing <strong>bad</strong> is going to happen &hellip; I promise that this won't cause:
</p>
<ul>
<li>Sinkholes</li>
<li>Alien Invasion</li>
<li>Spontaneous Combustion</li>
</ul>
<p>
&hellip; at worst, just weirdness.
</p>
		`;
		window.alert(message,'info');
	}
	window.app = new indexPage();

	// everything is loaded. make it visible;
	let style = document.createElement('style');
	style.innerHTML = ".preload{display:none;} .waitload{display:block;opacity:1;transition:opacity 1s;}";
	document.body.append(style);
});

let nexterrorreport = Date.now();
async function reporterror(event){
	if(typeof event === 'object'){
		console.dir(event);
	}
	console.error(event.toString());
	let errormsg = '';
	try{
		errormsg = new URL(event.filename);
	}
	catch(e){
		errormsg = new URL(window.location.href);
	}
	errormsg = `${event.message}\n[${errormsg.pathname}@${event.lineno}:${event.colno}]`;
	ga('send', 'exception', {
		'exDescription': errormsg,
		'exFatal': false
	});
	let usermsg = `
<p>
This is embarrassing. An error occured that I failed to anticipate.
<p>
I have made a note of this, but would love if you
<a target='_blank' href='https://gitlab.com/jefferey-cave/miss/issues'>would file an error
report</a>. Sometimes it's nice to talk the problem out with the person
that experienced it.
</p>
<p>Reference Message:</p>
<blockquote><code style='border-left:0.3em;'>${errormsg}</code></blockquote>
	`;
	if(Date.now() > nexterrorreport ){
		window.alert(usermsg,'fail');
		nexterrorreport = Date.now() + 1000 * 60 * 5;
	}

}

window.addEventListener('error',reporterror);
window.addEventListener("unhandledrejection", function(promiseRejectionEvent) {
	if(promiseRejectionEvent.reason && promiseRejectionEvent.reason.message === "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing."){
		console.warn('IDB deleting error.');
		return;
	}

	let msg = {
		message: JSON.stringify(promiseRejectionEvent.reason),
		colno: 0,
		lineno: 0,
		filename: window.location.href
	};
	let err = promiseRejectionEvent.reason;
	if(err.stack){
		err = err.stack.split('\n')[1].split('(').pop().split(')').shift().split(':');
		msg.message = promiseRejectionEvent.reason.message;
		msg.colno = err.pop();
		msg.lineno = err.pop();
		msg.filename = err.join(':');
	}
	else if(err.docId){
		msg.message = `${err.status} ${err.message}: ${err.docId}`;
	}
	reporterror(msg);
});
