const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');

const root = process.cwd();
let POOL = null;


(function(){
	let path = `${root}/test/bin`;
	if(!process.env.PATH.includes(path)){
		process.env.PATH = `${process.env.PATH}:${path}`;
	}
})();


class Browsers {

	constructor(poolsize=10, defaulttype='chrome'){
		this.poolsize = poolsize || 10;
		this.pool = new Map();
		this.avail = new Map();
		this.timeout = 600000;
		this.maxuse = 10;

		this.default = defaulttype;

		let chromeOpts = new chrome.Options();
		chromeOpts.addArguments('start-maximized');
		chromeOpts.addArguments('--no-sandbox');
		chromeOpts.setChromeBinaryPath('/usr/bin/chromium');
		this.chromeOpts = chromeOpts;

		let ffOpts = new firefox.Options();
		this.ffOpts = ffOpts;
	}

	async checkout(browsertype = this.default){
		let browser = null;
		if(this.avail.has(browsertype) && this.avail.get(browsertype).size > 0){
			let avail = this.avail.get(browsertype);
			browser = avail.values().next().value;
			avail.delete(browser);
		}
		else if(this.pool.size < this.poolsize){
			browser = await this.allDrivers[browsertype].build();
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
		await pool.browser.get('http://lvh.me:3030/?CompatCheck=wimp');
		// wait for the page to finish loading
		await pool.browser.executeAsyncScript(function(resolve){
			if(document.readyState === 'complete') resolve();
			window.app.addEventListener('load',function(){
				console.clear();
				resolve();
			});
		});
		// wait for the runner to be available
		await pool.browser.executeAsyncScript(function(resolve){
			let interval = setInterval(function(){
				if(window.app && window.app.runner && window.app.runner.isReady){
					clearInterval(interval);
					resolve();
				}
			},64);
		});
		// try clearing the database, but wait for it to finish
//		await pool.browser.executeAsyncScript(function(resolve){
//			(async ()=>{
//				await window.app.runner.Clear();
//				resolve();
//			})();
//		});
//		await browser.manage().logs().get('browser');
//		await pool.browser.get('http://lvh.me:3030/?CompatCheck=wimp');
//		await pool.browser.executeAsyncScript(function(resolve){
//			let interval = setInterval(function(){
//				if(window.app && window.app.runner && window.app.runner.isReady){
//					clearInterval(interval);
//					resolve();
//				}
//			},64);
//		});

		// send it
		return pool.browser;
	}

	async checkin(browser){
		let pool = this.pool.get(browser);
		if(pool.timeout){
			clearTimeout(pool.timeout);
			pool.timeout = null;
		}

		if(!this.avail.has(browser.type)){
			this.avail.set(browser.type,new Set());
		}
		this.avail.get(browser.type).add(browser);

		if(pool.used > this.maxuse){
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
		for(let avail of this.avail.values()){
			avail.delete(browser);
		}

		try{
			await browser.close();
			await browser.quit();
		}
		catch(e){
			console.debug('Releasing a browser');
		}
	}

	async run(browsers=null,func=(()=>{})){
		let test = this.use(browsers,func);
		await test();
	}

	use(browsers=null,func=(()=>{})){
		if(typeof browsers === 'function'){
			func = browsers;
			browsers = [this.default];
		}
		if(!Array.isArray(browsers)){
			browsers = [browsers];
		}
		let usable = async ()=>{
			let allBrowsers = Object.keys(this.allDrivers);
			for(let browser of browsers){
				if(!allBrowsers.includes(browser)){
					throw new Error(`Unknown Browser: ${browser}`);
				}
				browser = await this.checkout(browser);
				try {
					await func(browser);
					let errs = await browser.manage().logs().get('browser');
					errs = errs.filter(l=>{return (l.level.value >= 1000);}).map(l=>{return (l.message);});
					errs = errs.filter(l=>{
						return l.message !== "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.";
					});
					assert.isEmpty(errs,'Browser did not generate error messages during test');
				}
				finally {
					this.checkin(browser);
				}
			}
		};
		return usable;
	}

	get allDrivers(){
		return {
			'chrome':{
				url:'https://chromedriver.storage.googleapis.com/78.0.3904.70/chromedriver_linux64.zip',
				name:'chromedriver',
				postprocess: ['unzip'],
				build: async ()=>{
					let browser = await new webdriver.Builder()
						.forBrowser('chrome')
						.withCapabilities(webdriver.Capabilities.chrome())
						.setChromeOptions(this.chromeOpts)
						.build()
						;
					browser.type = 'chrome';
					return browser;
				}
			},
			'firefox':{
				url:'https://github.com/mozilla/geckodriver/releases/download/v0.26.0/geckodriver-v0.26.0-linux64.tar.gz',
				name:'geckodriver',
				postprocess: ['untar -xzf'],
				build: async ()=>{
					let browser = await new webdriver.Builder()
						.forBrowser('firefox')
						.setFirefoxOptions(this.ffOpts)
						.build()
						;
					browser.type = 'firefox';
					return browser;
				}
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
		if (!POOL) POOL = new Browsers();
		return POOL;
	}
}

(function(){
//	Browsers.pool.use();
})();

module.exports.Browsers = Browsers;
module.exports.pool = Browsers.pool;
module.exports.driver = webdriver;
module.exports.until = webdriver.until;
module.exports.By = webdriver.By;
module.exports.Key = webdriver.Key;
