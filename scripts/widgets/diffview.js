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
			if(this.left && this.right){
				let result = [this.left, this.right].sort().join('.');
				result = this.report.results[result];
				let tokens = result.submissions.filter((s)=>{ return s.name === submissionName; });
				let range = [null,null];
				tokens[0].finalList.slice(0).reverse().forEach((l)=>{
					if(range[0]-1 === l.range[1]){
						range[0] = l.range[0];
					}
					else{
						if(range[0] && range[1]){
							text = text.slice(0, range[1]) + '</span>' + text.slice(range[1]);
							text = text.slice(0, range[0]) + "<span style='background-color:green;'>" + text.slice(range[0]);
						}
						range[0] = l.range[0];
						range[1] = l.range[1];
					}
				});

			}

			return text;
		}
	}
});
