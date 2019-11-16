'use strict';

export{
	psSubmission,
	psSubmissionList
};

/*
global _
global HTMLElement
*/

import './psTreeView.js';

import {icons} from './icons.js';
import * as utils from '../DeepDiff/util/misc.js';

class psSubmissionList extends HTMLElement {
	constructor(){
		super();

		this._ = {};
		this._.DeepDiff = null;

		this._.panel = this.attachShadow({mode: 'open'});

		let style= document.createElement('style');
		this._.panel.append(style);
		style.textContent = this.initialCSS;

		this._.elems = document.createElement('div');
		this._.panel.append(this._.elems);

	}

	get DeepDiff(){
		return this._.DeepDiff;
	}

	set DeepDiff(value){
		if(this._.DeepDiff === value){
			return;
		}

		if(this.changeHandler){
			this._.DeepDiff.removeEventListener('submissions',this.changeHandler);
			this._.DeepDiff.removeEventListener('load',this.changeHandler);
		}
		else{
			this.changeHandler = (e)=>{
				if(!e.detail){
					this.Resync();
				}
				else if(e.detail.deleted){
					this.remove(e.detail.doc);
				}
				else{
					if(e.detail.id.startsWith('result.')) return;
					this.add(e.detail.doc);
				}
			};
		}

		this._.DeepDiff = value;

		this._.DeepDiff.addEventListener('change',this.changeHandler);
		this._.DeepDiff.addEventListener('load',this.changeHandler);

		this.pouchdb = value.db;
		//this.Render();
	}

	add(submission){
		// search for the alphabetic insertion point
		let inspos = null;
		for(let ref of this._.elems.children){
			if('submission.'+ref.Submission.name > submission.name){
				inspos = ref;
				break;
			}
		}
		// insert the element
		let sub = new psSubmission();
		sub.Submission = submission;
		sub.remover = ()=>{
			this.DeepDiff.removeSubmission(submission.name);
			submission.deleting = true;
		};
		this._.elems.insertBefore(sub,inspos);
	}

	remove(submission){
		Array.from(this._.elems.children).forEach((elem)=>{
			// get the name of the current element
			let name = 'submission.'+elem.Submission.name;
			// if the element does not exist in the reference list,
			// remvove it from the elements list
			let id = submission.name || submission._id;
			if(id === name){
				elem.parentNode.removeChild(elem);
			}
		});
	}

	Render(){
		this.Resync();
	}

	get Resync(){
		if(this._.renderer) return this._.renderer;

		let renderer = async ()=>{
			let parent = this._.elems;

			let isChange = false;
			let submissions = {};
			let orig = await this.DeepDiff.Submissions;
			for(let s=orig.length-1; s>=0; s--){
				let key = orig[s].name;
				submissions[key] = orig[s];
			}
			let keys = Object.keys(submissions);
			Array.from(parent.children).forEach((elem)=>{
				isChange = true;
				// get the name of the current element
				let name = 'submission.'+elem.Submission.name;
				// if the element does not exist in the reference list,
				// remvove it from the elements list
				if(!keys.includes(name)){
					elem.parentNode.removeChild(elem);
				}
				// removing elements that are
				let i = keys.indexOf(name);
				if(i >= 0){
					keys.splice(i, 1);
				}
			});
			// add all of the items that are left over
			isChange = isChange || (keys.length > 0);
			keys.forEach(key=>{
				this.add(submissions[key]);
			});

			if(isChange){
				let commonPath = Object.keys(submissions);
				commonPath = utils.CommonLead(commonPath,'/');
				for(let ref of parent.children){
					ref.CommonPath = commonPath;
				}
			}
		};

		renderer = _.throttle(renderer,100);
		this._.renderer = renderer;
		return renderer;
	}
}


class psSubmission extends HTMLElement {
	constructor(){
		super();
		this._ = {
			remover: null
		};
		this._.panel = this.attachShadow({mode: 'open'});
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

	get Submission(){
		return this._.submission;
	}
	set Submission(value){
		this._.submission = value;
		this.Render();
	}

	get CommonPath(){
		return this._.common || '';
	}
	set CommonPath(value){
		this._.common = value;
		let name = this._.panel.querySelector("output[name='name']");
		name.value = this.Submission.name.substr(this.CommonPath.length,Number.MAX_VALUE);
	}

	get remover(){
		return this._.remover;
	}
	set remover(value){
		this._.remover = ()=>{
			value();
			this.Render();
		};
	}

	remove(){
		if(this.remover){
			this.remover(this.Submission.name);
		}
	}

	showhide(event){
		// only explicit false is 'false' ... everything else is to be
		// assumed 'true'. Also, toggle it.
		let value = (this.submission.visible === false);
		// set it on the object
		this.submission.visible = value;
		return value;
	}

	Render(){
		let panel = this._.panel;
		panel.innerHTML = this.Template;

		let btn = panel.querySelector("button[name='remove']");
		btn.addEventListener('click',()=>{
			this.remove();
		});

		let name = this._.panel.querySelector("output[name='name']");
		name.value = this.Submission.name.substr(this.CommonPath.length,Number.MAX_VALUE);

		if(this.Submission.content){
			let tree = panel.querySelector('ps-treeview');
			tree.files = this.Submission.content;
		}

		if(this.Submission.deleting){
			let s = this.shadowRoot;
			s = s.querySelector('details');
			s.style.opacity = 0.5;
		}
	}

	get Template(){
		return psSubmission.Template;
	}
	static get Template(){
		return`
  <details>
   <summary>
    <button name='remove' title='Delete'>&#128465;</button>
    <output name='name'></output>
   </summary>
   <ps-treeview />
  </details>
		`;
	}

	get InitialCss(){
		return psSubmission.initialCSS;
	}

	static get InitialCss(){
		return`
button {
	border:0;
	background:transparent;
	min-height:1cm;
	min-width:1cm;
}
		`;
	}
}

window.customElements.define('ps-submission-list',psSubmissionList);
window.customElements.define('ps-submission',psSubmission);

try{
	/* global Vue */
	if(Vue){
		if(!Vue.config.ignoredElements.includes('ps-submission-list')){
			Vue.config.ignoredElements.push('ps-submission-list');
		}
		if(!Vue.config.ignoredElements.includes('ps-submission')){
			Vue.config.ignoredElements.push('ps-submission');
		}
	}
}
catch(err){}
