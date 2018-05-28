'use strict';

import "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.9.0/underscore-min.js";

/*
global _
*/

Vue.component('filedrop',{
	template:[
		'<label :for="uuid" class="filedrop">',
		' <div :class="{dragover:isDragOver}">',
		'  <slot>Click or drop something here</slot>',
		' </div>',
		' <input type="file" :id="uuid" @change="change" @dragenter="dragenter" @dragleave="dragleave" @dragend="dragleave">',
		'</label>'
	].join('\n'),
	props:{
		onfile:{
			type:Function,
			default:function(){}
		}
	},
	data:function(){
		return {
			id:null,
			isDragOver:false,
		};
	},
	computed:{
		uuid:function(){
			if(this.id === null){
				this.id = _.uniqueId('filedrop_');
			}
			return this.id;
		}
	},
	methods:{
		change: function(e){
			this.isDragOver = false;
			this.onfile(e);
		},
		dragenter:function(){
			this.isDragOver = true;
		},
		'dragleave':function(){
			this.isDragOver = false;
		}
	}
});

