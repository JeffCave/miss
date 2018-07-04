'use strict';



Vue.component('resultmatrixcell', {
	template: '#resultmatrixcell-template',
	props: {
		resultSubmission: {
			type: Object,
			default: function(){
				return {
					identicalTokens:0,
					totalTokens:0,
					percentMatched:1,
				};
			},
		},
		parent:{
			type: Object,
			default: function(){
				return {
					complete:0,
					totalTokens:1
				};
			},
		},
		isSame:Boolean
	},
	data: function () {
		return {};
	},
	computed:{
		style:function(){
			let style = {
				position:'absolute',
				display:'table-cell',
				textAlign:'left',
				verticalAlign:'top',
				//width:'20px',
				//height:'20px',
				top:"-0.5em",
				left:'-0.5em',
				color: 'var(--notice-info-high)',
				padding:0,
				margin:0,
				fontSize:'1000%',
				overflow:'hidden'
			};
			style.opacity = this.resultSubmission.percentMatched/0.3;
			if(style.opacity > 1){
				style.opacity = 1;
			}
			if(!this.isComplete && !this.isSame){
				style.color = 'var(--notice-warn-high)';
			}
			return style;
		},
		isComplete:function(){
			return this.parent.complete === this.parent.totalTokens;
		},
		title:function(){
			let label = '% similarity';
			let pct = this.resultSubmission.percentMatched;
			pct = pct * 100;
			pct = pct.toFixed(0);
			pct = [pct, label];
			pct = pct.join('');
			return pct;
		}
	}
});



// define the item component
Vue.component('resultmatrix', {
	template: '#resultmatrix-template',
	props: {
		report: {
			type: Object,
			default: function(){
				return {
					results:{},
					submissions:{},
					archives:[],
				};
			},
		},
	},
	data: function () {
		return {};
	},
	computed: {
		orderedSubmissions:function(){
			let submissions = Object.values(this.report.submissions);
			submissions.sort((a,b)=>{ return a.name.localeCompare(b.name); });
			return submissions;
		},
	},
	methods:{
		getResultSubmission:function(subA,subB){
			let result = this.getResult(subA,subB);
			if(!result) return result;
			let submission = result.submissions
				.filter((s)=>{
					return s.name === subA.name;
				});
			return submission[0];
		},
		getResult:function(subA,subB){
			let key = [subA.name,subB.name].sort().join('.');
			let result = this.report.results[key];
			return result;
		},
	}
});
