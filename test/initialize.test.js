if(!global.Browser){
	require('./helper');
}

describe('First Run', function() {
	it('Database initialized', async function(){
		let self = this;
		let test = Browser.use(async (browser)=>{
			if(browser.type === 'firefox') self.skip('Firefox not supported');

			//1. Open page
			//2. Open Browser Debug Window (F12)
			//3. NAV: Application > Storage
			//4. Delete all the databases
			await browser.executeScript('indexedDB.databases().then(dbs=>{let dels = dbs.map(d=>{return indexedDB.deleteDatabase(d.name);}); return Promise.all(dels);});');
			//5. Refresh the page
			await browser.navigate().refresh();

			el = await browser.findElement(Browser.driver.By.css('main'));
			await browser.wait(Browser.driver.until.elementIsVisible(el),1000);

			await browser.sleep(100);
			let logs = await browser.manage().logs().get('browser');
			let errs = logs.filter(l=>{
				return (l.level.value >= 1000);
			});
			assert.equal(0,errs.length,'No error messages');
		})
		await test();
	});
});
