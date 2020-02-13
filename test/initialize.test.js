if(!global.Browser){
	require('./helper');
}

describe('First Run', function() {
	it.skip('Compat check is not disruptive on first load', async function(){
		let self = this;
		return Browser.run(async (browser)=>{
			await browser.get('http://lvh.me:3030');

			await browser.sleep(1000);
			// https://www.seleniumeasy.com/selenium-tutorials/accessing-shadow-dom-elements-with-webdriver
			let alert = await browser.findElement(Browser.By.css('header > ps-alert > #shadow-root > div > blockquote'));
			let disp = await alert.isDisplayed();
			if(disp){
				let text = await alert.getText();
				assert.include('browser compatibility issues',text,'Browser compatibility alert is visible');
			}
		});
	});


	it.skip('Database initialized', async function(){
		let self = this;
		return Browser.run(async (browser)=>{
			if(browser.type === 'firefox') self.skip('Firefox not supported');

			//1. Open page
			//2. Open Browser Debug Window (F12)
			//3. NAV: Application > Storage
			//4. Delete all the databases
			let logs = await browser.manage().logs().get('browser');
			await browser.executeAsyncScript(function(resolve){
				(async function(){
					let dbs = await indexedDB.databases();
					let dels = dbs.map(d=>{ return indexedDB.deleteDatabase(d.name); });
					await Promise.all(dels);
					resolve();
				})();
			});
			//5. Refresh the page
			await browser.navigate().refresh();
			await browser.executeAsyncScript(function(resolve){
				let interval = setInterval(function(){
					if(window.app && window.app.runner && window.app.runner.isReady){
						clearInterval(interval);
						resolve();
					}
				},64);
			});

			logs = await browser.manage().logs().get('browser');
			let errs = logs.filter(l=>{
				return (l.level.value >= 1000);
			});
			errs = errs.filter(l=>{
				return l.message !== 'https://cdnjs.cloudflare.com/ajax/libs/pouchdb/7.0.0/pouchdb.min.js 6:68578 Uncaught DOMException: Failed to execute \'transaction\' on \'IDBDatabase\': The database connection is closing.';
			});
			if(errs.length > 0){
				errs.forEach(console.debug);
			}
			assert.isEmpty(errs,'No error messages');
		})
	});
});
