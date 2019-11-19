const child = require('child_process');

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const Mocha = require('mocha');

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
		postprocess: ['untar -xzf']
	}
};

let path = `${root}/test/bin`;
process.env.PATH = `${process.env.PATH}:${path}`;
for(let driver in allDrivers){
	let driverpath = `${path}/${driver.name}`;
	if(!fs.existsSync(driverpath)){
		const file = fs.createWriteStream(driverpath);
		https
			.get(allDrivers[driver].url, (resp) => {
				console.log('statusCode:', resp.statusCode);
				console.log('headers:', resp.headers);
				resp.pipe(file);
			})
			.on('error', (e) => {
				console.error(e);
			})
			;
	}
}


async function test(){
	let mocha = new Mocha();
	mocha.addFile('./test/selftest.js');
	mocha.addFile('./test/initialize.js');
	mocha.reporter('spec');
	mocha.timeout(5000);
	let runner = mocha.run();
	await new Promise((resolve)=>{
		runner.addListener('end',(e)=>{
			resolve();
		})
	});
}

async function main(){
	let server = child.spawn('node',['./server.js']);
	await new Promise((resolve)=>{
		setTimeout(resolve,10);
	});
	try{
		await test();
	}
	finally{
		process.kill(server.pid);
	}
}

main();
