'use strict';

import {Submission} from '../DeepDiff/submission/Submission.js';
import {DeepDiff} from '../DeepDiff/DeepDiff.js';
import {icons} from './icons.js'

// define the item component
Vue.component('submission', {
	template: '#submission-template',
	props: {
		submission: Submission,
		remover:{
			type:Function,
			default: null
		}
	},
	data: function () {
		return {};
	},
	computed:{
		isShow:function(){
			return !(this.submission.visible === false);
		},
		showhideIcon: function(){
			if(this.isShow){
				return icons.visibility;
			}
			return icons.visibility_off;
		}
	},
	methods:{
		remove:function(){
			if(this.remover){
				this.remover(this.submission.name);
			}
		},
		showhide:function(event){
			// only explicit false is 'false' ... everything else is to be
			// assumed 'true'. Also, toggle it.
			let value = (this.submission.visible === false);
			// set it on the object
			Vue.set(this.submission,'visible',value);
			return value;
		}
	}

});

// define the item component
Vue.component('submission-list', {
	template: '#submissions-template',
	props: {
		pouchdb: {
			required:true
		},
		filter: {
			default:'checksims/submissions',
			type:String
		},
		opts: {
			type: Object,
			default: function(){
				return {
					live:true,
					include_docs:true,
				};
			},
		}
	},
	data: function () {
		return {
			submissions:{},
		};
	},
	created: function () {
		let opts = this.opts;
		opts.filter = this.filter;
		this.pouchdb.changes(opts).on('change',(e)=>{
			if(e.deleted){
				Vue.delete(this.submissions, e.id);
			}
			else{
				let doc = Submission.fromJSON(e.doc);
				Vue.set(this.submissions, e.id, doc);
			}
		});
	},
	computed: {
		ordered : function(){
			return Object.values(this.submissions)
				.sort((a,b)=>{
					return a.name.localeCompare(b.name);
				});
		}
	},
	methods:{
		remover:function(id){
			id = ['submission',id].join('.');
			this.pouchdb.upsert(id,function(){
				return {_deleted:true};
			});
		}
	}
});
