'use strict';

import {Submission} from '../DeepDiff/submission/Submission.js';

/*
global Vue
*/


// define the item component
Vue.component('diffview', {
	template: '#diffview-template',
	props: {
		left:String,
		right:String,
		report: {
			type: Object,
			default: function(){
				return {};
			},
		},
	},
	data: function () {
		return {
		};
	},
	created:function(){
	},
	computed: {
		textLeft:function(){
			let text = this.formatText(this.left);
			return text;
		},
		textRight:function(){
			let text = this.formatText(this.right);
			return text;
		},
	},
	methods:{
		submissionLeft:function(e){
			console.log(e);
		},
		submissionRight:function(e){
			console.log(e);
		},
		formatText(submissionName){
			let submission = this.report.submissions[submissionName];
			if(!submission) return '';

			let text = '';
			//submission = Submission.fromJSON(submission);
			//text = submission.ContentAsString;

			text = Object.entries(submission.content)
				.map(function(entry){
					return '<details open="false"><summary>'+entry[0]+'</summary><pre>'+entry[1]+'</pre></details>';
				})
				.join('')
				;
			return text;
		}
	}
});
