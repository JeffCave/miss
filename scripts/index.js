'use strict';

/*
global Vue
global JSZip
*/


import {DeepDiff} from './DeepDiff/DeepDiff.js';
import {Submission} from './DeepDiff/submission/Submission.js';
import * as unpack from './DeepDiff/util/unpack.js';
import {psFile} from './DeepDiff/util/psFile.js';
import {ContentHandlers} from './DeepDiff/submission/ContentHandlers.js';


import './widgets/psFileDrop.js';
import './widgets/psForceDirected.js';
import './widgets/psMatrixMap.js';
import './widgets/psPanelElement.js';
import './widgets/psSubmissions.js';
import './widgets/psTabbedPanelElement.js';
import './widgets/psTornadoChart.js';


/**
 * Parses DeepDiff' command-line options.
 *
 * TODO: Consider changing from a  class? Having as an instance variable would greatly simplify
 */
class indexPage {
	constructor() {
		this.runner = new DeepDiff();
		this.files = [];
		let self = this;

		Array.from(document.querySelectorAll('form[is="deepdiff-opts"]')).forEach(opts=>{
			opts.ddInstance = this.runner;
		});
		let forcechart = document.querySelector('#forcechart');
		forcechart.results = this.runner.report;
		let tornadochart = document.querySelector('#tornadochart');
		tornadochart.report = this.runner.report;
		let matrixmap = document.querySelector('#matrixmap');
		matrixmap.report = this.runner.report;

		let uploadSubmission = document.querySelector('#UploadSubmission');
		uploadSubmission.addEventListener('change', async (e)=>{
			let files = e.target.files;
			let folder = await this.FindFolderStart(files);
			let submission = new Submission(folder.name,folder.files);
			this.runner.addSubmissions(submission);
		});

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


		let submissions = document.querySelector('#submissions');
		submissions.pouchdb = this.runner.db;
		submissions.filter = 'checksims/submissions';
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



		let maxlen = Number.MAX_VALUE;
		let names = Object.values(files)
			.map((file)=>{
				let path = file.relativePath.split('/');
				maxlen = Math.min(maxlen,path.length);
				return path;
			})
			.map(path=>{
				path = path.slice(0,maxlen);
				return path;
			})
			;

		for(let allsame = false; !allsame && maxlen > 0; maxlen--){
			allsame = names
				.map(name=>{
					return name.join();
				})
				.every((name,i,names)=>{
					if(i === 0){
						return true;
					}
					let rtn = name === names[i-1];
					return rtn;
				})
				;
			if(!allsame){
				names.forEach((name)=>{
					name.pop();
				});
			}
		}
		let name = names[0] || [];
		name = name.join('/');

		files = Object.entries(files).reduce((a,d)=>{
			let key = d[0].substr(name.length+1);
			let value = d[1];
			a[key] = value;
			return a;
		},{});

		return {
			name: name,
			files: files
		};
	}


	attachCommon(blob){
		let parent = this;
		this.common = null;
		// 1) read the Blob
		return JSZip
			.loadAsync(blob)
			.then(function(zip) {
				parent.common = zip;
			})
			.catch(function (e) {
				console.error("Error reading " + blob.name + ": " + e.message);
			})
			;
	}



	/**
	 * Parse CLI arguments and run DeepDiff from them.
	 *
	 * TODO add unit tests
	 *
	 * @param args CLI arguments to parse
	 */
	async runHtml(htmlContainers = null){
		if(!htmlContainers){
			htmlContainers = this.Containers;
		}
		let checkSims = this.runner;

		checkSims.CommonCode = this.common;
		checkSims.ArchiveSubmissions = this.archive;
		let results = await checkSims.runDeepDiff();

		this.renderResults(results,htmlContainers);
	}

}



window.addEventListener('load',async function(){
	Vue.use(VueMaterial.default);
	Vue.use(httpVueLoader);

	let checker = new indexPage();
});

