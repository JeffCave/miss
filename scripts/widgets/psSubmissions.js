'use strict';

export{
	psSubmission,
	psSubmissionList
};

/*
global HTMLElement
*/

import {psTreeView} from './psTreeView.js';
import {Submission} from '../DeepDiff/submission/Submission.js';
import {icons} from './icons.js';

class psSubmissionList extends HTMLElement {
	constructor(){
		super();

		this._ = {};
		this._.submissions = {};

		this._.panel = this.attachShadow({mode: 'open'});

		let style= document.createElement('style');
		this._.panel.append(style);
		style.textContent = this.initialCSS;

		this._.elems = document.createElement('div');
		this._.panel.append(this._.elems);
	}

	get pouchdb(){
		return this._.pouchdb;
	}
	set pouchdb(value){
		if(this._.pouchdb === value){
			return;
		}
		if(this._.changes){
			changes.cancel();
		}

		let changes = value.changes({
			live:true,
			include_docs:true,
			filter: 'checksims/submissions'
		});
		changes.on('change',async (e)=>{
			if(e.deleted){
				delete this.Submissions[e.id];
			}
			else{
				let sub = new psSubmission();
				sub.Submission = await Submission.fromJSON(e.doc);
				sub.remover = (id)=>{
					this.remover(id);
				};
				this.Submissions[e.id] = sub;
			}
			this.Render();
		});

		this._.changes = changes;
		this._.pouchdb = value;
	}

	get Submissions(){
		return this._.submissions;
	}

	remover(id){
		id = ['submission',id].join('.');
		this.pouchdb.upsert(id,function(){
			return {_deleted:true};
		});
	}

	Render(){
		let parent = this._.elems;

		let submissions = {};
		Object.entries(this.Submissions).forEach((d)=>{
			submissions[d[0]] = d[1];
		});
		let keys = Object.keys(submissions);
		Array.from(parent.children).forEach((elem)=>{
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
		keys.forEach(key=>{
			// search for the alphabetic insertion point
			let inspos = null;
			for(let ref of parent.children){
				if('submission.'+ref.Submission.name > key){
					inspos = ref;
					break;
				}
			}
			// insert the element
			parent.insertBefore(submissions[key],inspos);
		});
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

	get remover(){
		return this._.remover;
	}
	set remover(value){
		this._.remover = value;
		this.Render();
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
		Vue.set(this.submission,'visible',value);
		return value;
	}

	Render(){
		let panel = this._.panel;
		panel.innerHTML = this.Template;

		let btn = panel.querySelector("button[name='remove']");
		btn.addEventListener('click',()=>{
			this.remove();
		});

		let name = panel.querySelector("output[name='name']");
		name.value = this.Submission.name;

		let tree = panel.querySelector('ps-treeview');
		tree.files = this.Submission.content;
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
