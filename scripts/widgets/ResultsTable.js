'use strict';

//import 'https://cdnjs.cloudflare.com/ajax/libs/d3/4.13.0/d3.min.js';
//import 'https://d3js.org/d3-format.v1.min.js';

// define the item component
Vue.component('tornadoresult-list', {
	template: '#tornadoresult-template',
	props: {
		report: {
			type: Object,
			default: function(){
				return {
					results:[],
					submission:[],
					archives:[]
				};
			},
		},
	},
	data: function () {
		return {};
	},
	computed: {
		ordered : function(){
			let list = Object.values(this.report.results)
				.sort((a,b)=>{
					let order = 0;
					if(order === 0){
						let bp = (b.complete === b.totalTokens)?1:0;
						let ap = (a.complete === a.totalTokens)?1:0;
						order = bp - ap;
					}
					if(order === 0){
						order = b.percentMatched - a.percentMatched;
					}
					if(order === 0){
						order = a.name.localeCompare(b.name);
					}
					return order;
				});
			return list;
		}
	},
	methods:{
		isComplete: function(result){
			return (result.complete === result.totalTokens);
		},
		formatPct(pct){
			pct = pct * 100;
			pct = pct.toFixed(0);
			return pct;
		},
		formatTitle(pct){
			let label = '% similarity';
			pct = this.formatPct(pct);
			pct = [pct, label];
			pct = pct.join('');
			return pct;
		}
	}
});
