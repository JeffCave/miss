const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
//const firefox = require('selenium-webdriver/firefox');

const root = process.cwd();
let POOL = null;


(function(){
	let path = `${root}/test/bin`;
	if(!process.env.PATH.includes(path)){
		process.env.PATH = `${process.env.PATH}:${path}`;
	}
})();


class Browsers {

	constructor(poolsize){
		this.poolsize = poolsize || 10;
		this.pool = new Map();
		this.avail = [];
		this.locked = [];
		this.timeout = 60000;
		this.maxuse = 10;

		let chromeOpts = new chrome.Options();
		//chromeOpts.addArguments('start-maximized');
		chromeOpts.addArguments('--no-sandbox');
		chromeOpts.setChromeBinaryPath('/usr/bin/chromium');
		//chromeOpts.setChromeBinaryPath('/usr/bin/chromium-browser');
		//chromeOpts.setChromeBinaryPath('/usr/lib/chromium-browser/chromium-browser')
		//chromeOpts.setChromeBinaryPath('/usr/bin/google-chrome-stable');
		//chromeOpts.headless();

		this.chromeOpts = chromeOpts;

		//this.checkin(this.checkout());
	}

	async checkout(){
		let browser = null;
		if(this.avail.length > 0){
			browser = this.avail.pop();
		}
		else if(this.pool.size < this.poolsize){
			browser = await new webdriver.Builder()
				.forBrowser('chrome')
				.withCapabilities(webdriver.Capabilities.chrome())
				.setChromeOptions(this.chromeOpts)
				.build()
				;
			this.pool.set(browser,{
				used:0,
				timeout:null,
				browser:browser
			});
		}
		else{
			console.error("Browser pool exceeded");
			throw new Error('Browser pool size exceeded');
		}
		let pool = this.pool.get(browser);
		pool.used++;
		pool.timeout = setTimeout(()=>{
			this.dispose(browser);
		},this.timeout);
		// get the default page
		await pool.browser.get('http://lvh.me:3030');
		// wait for it to load
		await new Promise((resolve,reject)=>{
			let fail = setTimeout(()=>{
				clearTimeout(success);
				reject('Timed out');
			},1000);

			let success = null;
			async function check(){
				let complete = await pool.browser.executeScript('return document.readyState;');
				if(complete === 'complete'){
					clearTimeout(fail);
					resolve();
				}
				else{
					success = setTimeout(check,64);
				}
			}
			check();
		});
		// send it
		return pool.browser;
	}

	async checkin(browser){
		let pool = this.pool.get(browser);
		if(pool.timeout){
			clearTimeout(pool.timeout);
			pool.timeout = null;
		}
		if(pool.used < this.maxuse){
			this.avail.push(browser);
		}
		else{
			this.dispose(browser);
		}
	}

	async take(){
		let browser = this.checkout();
		this.pool.delete(browser);
		return browser;
	}

	async dispose(browser){
		if(!browser){
			browser = this.pool.keys();
			browser = Array.from(browser);
		}
		if(Array.isArray(browser)){
			return browser.every(b=>{
				return this.dispose(b);
			});
		}
		if(!(browser instanceof webdriver.WebDriver)){
			return false;
		}

		if(this.pool.has(browser)){
			this.pool.delete(browser);
		}
		let avail = this.avail.indexOf(browser);
		if(avail >= 0){
			this.avail.splice(avail,1);
		}

		try{
			await browser.close();
			await browser.quit();
		}
		catch(e){
			console.debug('Releasing a browser');
		}
	}

	use(func=(()=>{})){
		let usable = async ()=>{
			let browser = await this.checkout();
			try {
				await func(browser);
			}
			finally {
				this.checkin(browser);
			}
		}
		return usable;
	}

	get allDrivers(){
		return {
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
	}

	static get driver(){
		return webdriver;
	}
	get driver(){
		return Browsers.driver;
	}
	get until(){
		return this.driver.until;
	}
	get By(){
		return this.driver.By;
	}
	get Key(){
		return this.driver.Key;
	}

	static get pool(){
		if (!POOL) POOL = new Browsers(10);
		return POOL;
	}
}



module.exports.Browsers = Browsers;
module.exports.pool = Browsers.pool;
module.exports.driver = webdriver;
module.exports.until = webdriver.until;
module.exports.By = webdriver.By;
module.exports.Key = webdriver.Key;
