export{
	swAlgoWebWorker
};

import './swAlgoBase.js';

/*
global SmithWatermanBase
*/

class swAlgoWebWorker extends SmithWatermanBase{

	constructor(name, a, b, opts){
		super(name,a,b,opts);

		this.name = name;
		this.a = a;
		this.b = b;

		let WorkerUrl = window.location.pathname.split('/');
		WorkerUrl.pop();
		WorkerUrl = WorkerUrl.concat(('/scripts/DeepDiff/algorithm/smithwaterman/webworkers/'+this._.variant+'.js?').split('/'));
		WorkerUrl = WorkerUrl.filter((u)=>{return u;});
		WorkerUrl.unshift(window.location.origin);
		WorkerUrl = WorkerUrl.join('/');

		//this.thread = new Worker(WorkerUrl, {type:'module'});
		this.thread = new Worker(WorkerUrl);
		this.thread.onmessage = (msg)=>{
			this.postMessage(msg);
		};
		this.thread.onerror = (msg)=>{
			this.postMessage({type:'error',data:{error:msg}});
		};

		this.pause();
	}

	start(){
		this.thread.postMessage(JSON.clone({
			action:'start',
			name:this.name,
			submissions:[this.a, this.b],
			options:this._,
		}));
	}

	pause(){
		this.thread.postMessage({action:'pause'});
	}

	terminate(){
		this.thread.postMessage({action:'stop'});
		this.thread.terminate();
		this.thread = null;
		delete this.thread;
	}

	stop(){
		this.thread.postMessage({action:'stop'});
	}

}

