const child = require('child_process');
const util = require('util');
const glob = require('glob');

const Mocha = require('mocha');
const browser = require('./test/utils/browsers').pool;

const https = require('https');
const fs = require('fs');
const root = process.cwd();


let allDrivers = {
	'chrome':{
		url:'https://chromedriver.storage.googleapis.com/78.0.3904.70/chromedriver_linux64.zip',
		name:'chromedriver',
		postprocess: ['unzip']
	},
	'firefox':{
		url:'https://github.com/mozilla/geckodriver/releases/download/v0.26.0/geckodriver-v0.26.0-linux64.tar.gz',
		name:'geckodriver',
		postprocess: ['tar','-xzf']
	}
};


async function loadbrowsers(){
	let exec = util.promisify(child.execFile);
	let path = `${root}/test/bin`;
	process.env.PATH = `${process.env.PATH}:${path}`;
	let promises = [];
	for(let driver in allDrivers){
		driver = allDrivers[driver];
		let driverpath = `${path}/${driver.name}`;
		if(!fs.existsSync(driverpath)){
			driverpath = `${driverpath}.tmp`;
			const file = fs.createWriteStream(driverpath);
			const promise = new Promise((resolve,reject)=>{
				https
					.get(driver.url, (resp) => {
						console.log('statusCode:', resp.statusCode);
						console.log('headers:', resp.headers);
						resp.pipe(file);
						resp.on('end',()=>{
							let args = driver.postprocess.slice();
							args.push(driverpath);
							let cmd = args.shift();
							cmd = exec(cmd,args)
								.then(()=>{
									fs.unlink(driverpath);
									resolve();
								})
								.catch((err)=>{
									console.error(err);
									exit(1);
								});
						});
					})
					.on('error', (e) => {
						console.error(e);
						reject(e);
					})
					;
			});
			promises.push(promise);
		}
	}
	return Promise.all(promises);
}

async function test(){
	// setup Mocha
	let mocha = new Mocha();
	mocha.reporter('spec');
	mocha.timeout(5000);

	// look up all the files
	let files = await new Promise(resolve=>{
		glob('./test/**/*.test.js',(err,files)=>{ resolve(files); });
	});
	for(let file of files){
		mocha.addFile(file);
	}

	// execute the suite
	let runner = mocha.run();
	let results = await new Promise((resolve)=>{
		runner.addListener('end',()=>{
			let stats = runner.stats;
			resolve(stats);
		})
	});
	return results;
}

async function main(){
	await loadbrowsers();
	let server = child.spawn('node',['./server.js']);
	let results = {};
	await new Promise((resolve)=>{
		setTimeout(resolve,10);
	});
	try{
		browser.chromeOpts.headless();
		browser.ffOpts.headless();
		let i = process.argv.indexOf('--browser');
		if(i > 0){
			let btype = process.argv[i+1];
			browser.default = btype;
		}
		await browser.use();
		results = await test();
	}
	finally{
		browser.dispose();
		try{
			process.kill(server.pid);
		}
		catch(e){}
	}
	process.exit(results.failures || 0);
}

main();
