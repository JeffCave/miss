'use strict';

import {Submission} from '../Checksims/submission/Submission.js';

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
	methods:{
		remove:function(){
			if(this.remover){
				this.remover(this.submission.name);
			}
		},
		showhide:function(){

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
			submissions:{}
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
