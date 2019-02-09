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
import './widgets/psTabbedPanelElement.js';
import './widgets/psTornadoChart.js';

import './widgets/diffview.js';
import './widgets/submissions.js';
import './widgets/treeview.js';



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
				for(let f in values){
					let file = values[f];
					let type = file.type;
					if(type === 'application/octet-stream'){
						let ext = file.name.split('.').pop();
						let handler = ContentHandlers.lookupHandlerByExt(ext);
						type = handler.mimetype;
						if(!type){
							type = 'text/plain';
							if(ContentHandlers.ignores.includes(ext)){
								type = 'application/octet';
							}
						}
					}
					file = new psFile(file, file.name, {type:type});
					file = await file.toJSON();
					values[f] = file;
				}
				let submission = new Submission(key,values);
				submissions.push(submission);
			}
			this.runner.addSubmissions(submissions);
		});


		this.displaySubmissions = new Vue({
			el:'#submissions',
			data: {
				db: this.runner.db,
				filter: 'checksims/submissions',
			},
		});
		this.displayFiles = new Vue({
			el: '#files',
			data: {
				treeData: this.files,
				onfile: ()=>{}
			}
		});
		this.displayDiff = new Vue({
			el:'#compare',
			data: {
				report:this.runner.report
			},
		});

		let adder = document.querySelector('#submissionMaker');
		adder.addEventListener('dragover',function(event){
			event.preventDefault();
			event.target.style.backgroundColor="green";
		});
		adder.addEventListener('dragleave',function(event){
			event.target.style.backgroundColor="transparent";
		});
		adder.addEventListener('drop',function(event){
			event.target.style.backgroundColor="blue";
			let path = event.dataTransfer.getData("text/plain");
			path = new RegExp("^" + path);
			let files = self.files
				.filter(function(d){
					let isMatch = path.test(d.name);
					return isMatch;
				})
				.reduce(function(a,d){
					let p = d.name.replace(path,'');
					a[p] = d.content;
					return a;
				},{})
				;
			path = event.dataTransfer.getData("text/plain");
			path = path.split('/').pop();
			let submission = new Submission(path,files);
			self.runner.addSubmissions(submission);
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
		let name = names[0];
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

