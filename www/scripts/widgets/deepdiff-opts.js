'use strict';

/*
global HTMLFormElement
*/



class DeepdiffOpts extends HTMLFormElement{
	constructor() {
		super();
		this._ = {};
		window.addEventListener('load',()=>{
			DeepdiffOpts.isRendered = true;
		});
	}

	set ddInstance(instance){
		if(this._.instance !== instance){
			this._.instance = instance;
			instance.addEventListener('load',()=>{
				this.UpdateAlgoList();
			});
			this.UpdateAlgoList();
		}
	}

	get ddInstance(){
		return this._.instance;
	}

	connectedCallback() {
		if(!DeepdiffOpts.isRendered){
			window.addEventListener('load',()=>{
				this.connectedCallback();
			});
			return;
		}

		let instance = this.getAttribute('for');
		if(instance){
			this.ddInstance = eval(instance);
		}
		this.UpdateAlgoList();

	}

	UpdateAlgoList(){
		let dlAlgos = this.querySelector('datalist[name="algorithms"]');
		if(!dlAlgos){
			dlAlgos = document.createElement('datalist');
			dlAlgos.setAttribute('name','algorithms');
			this.appendChild(dlAlgos);
		}

		let title = this.querySelector("input[name='title']");
		if(this._.instance){
			if(this._.title !== title){
				this._.title = title;
				['blur','change','keyup','input'].forEach((event)=>{
					title.addEventListener(event,(e)=>{
						this._.instance.Title = e.target.value;
					});
				});
			}
			title.value = this._.instance.Title;
		}


		let algos = [['No Algorithms found',{availabe:false}]];
		let algo = algos[0];
		if(this.ddInstance){
			algos = this.ddInstance.AlgorithmRegistry;
			algo = this.ddInstance.Algorithm;
			algo = Object.entries(algos)
				.filter((a)=>{
					return a[1] === algo;
				})[0][0]
				;
			algos = Object.entries(algos).filter(a=>{return a[0]!=='linecompare';}).sort();
		}

		dlAlgos.innerHTML = "";
		algos.map((algo)=>{
				let opt = document.createElement('option');
				opt.value = algo[0];
				opt.innerText = algo[0];
				if(!algo[1].available){
					opt.setAttribute('disabled','');
				}
				return opt;
			})
			.forEach((algo)=>{
				dlAlgos.append(algo);
			})
			;

		if(!this._.selectChange){
			this._.selectChange = (evt)=>{
				this.ddInstance.Algorithm = evt.target.value;
				this.UpdateAlgoList();
			};
		}
		let selects = Array.from(this.querySelectorAll('select'));
		selects.forEach(select=>{
			let listname = select.getAttribute('list');
			if(listname){
				let list = document.querySelector('#'+listname);
				if(!list){
					list = this.querySelector('datalist[name="'+listname+'"]');
				}
				if(list){
					Array.from(select.children).forEach(child=>{
						select.removeChild(child);
					});
					Array.from(list.children).forEach(child=>{
						select.appendChild(child);
					});
				}
			}
			select.value = algo;
			select.removeEventListener('change',this._.selectChange);
			select.addEventListener('change',this._.selectChange,{passive:true});
		});
	}

}

// Register our new element
if(!window.customElements.get('deepdiff-opts')){
	window.customElements.define('deepdiff-opts', DeepdiffOpts, {extends:'form'});
}
try{
	/* global Vue */
	if(!Vue.config.ignoredElements.includes('deepdiff-opts')){
		Vue.config.ignoredElements.push('deepdiff-opts');
	}
}
catch(err){}
