if(!global.Browser){
	require('./helper');
}

const Path = require('path');

describe('File Add/Remove', function() {

	async function addFiles(browser){
		let files = await browser.findElement(Browser.By.css('#UploadSubmissions'));
		files = await browser.executeScript('return arguments[0].shadowRoot;',files);
		files = await files.findElement(Browser.By.css('input'));
		let path = Path.resolve('./www/samples/sampleassignment.zip');
		await browser.sleep(1000);
		await files.sendKeys(path);
		await browser.sleep(4000);
	}

	it('Add Files', async function(){
		let self = this;
		return Browser.run(async (browser)=>{
			await addFiles(browser);

			let subs = await browser.findElement(Browser.By.css('ps-submission-list'));
			subs = await browser.executeScript('return arguments[0].shadowRoot;',subs);
			subs = await subs.findElements(Browser.By.css('ps-submission'));
			assert.isNotEmpty(subs,'Submissions extracted');
		});
	});

	it('Remove Files', async function(){
		let self = this;
		return Browser.run(async (browser)=>{
			await addFiles(browser);

			let subs = await browser.findElement(Browser.By.css('ps-submission-list'));
			subs = await browser.executeScript('return arguments[0].shadowRoot;',subs);
			subs = await subs.findElements(Browser.By.css('ps-submission'));
			subs = Array.from(subs);
			assert.isNotEmpty(subs,'Submissions extracted');

			while(subs.length){
				let sub = subs.pop();
				let rem = await browser.executeScript('return arguments[0].shadowRoot;',sub);
				rem = await rem.findElement(Browser.By.css('button[name="remove"]'));
				await rem.click();
			}

			await browser.sleep(500);
			subs = await browser.findElement(Browser.By.css('ps-submission-list'));
			subs = await browser.executeScript('return arguments[0].shadowRoot;',subs);
			subs = await subs.findElements(Browser.By.css('ps-submission'));
			subs = Array.from(subs);
			assert.isEmpty(subs,'Submissions have been removed');
		});
	});

	it('Dump Database', async function(){
		let self = this;
		return Browser.run(async (browser)=>{
			await addFiles(browser);

			let del = await browser.findElement(Browser.By.css('#DeleteAll'));
			await del.click();
			await browser.executeAsyncScript(function(resolve){
				let interval = setInterval(function(){
					if(window.app && window.app.runner && window.app.runner.isReady){
						clearInterval(interval);
						resolve();
					}
				},64);
			});

			subs = await browser.findElement(Browser.By.css('ps-submission-list'));
			subs = await browser.executeScript('return arguments[0].shadowRoot;',subs);
			subs = await subs.findElements(Browser.By.css('ps-submission'));
			subs = Array.from(subs);
			assert.isEmpty(subs,'Submissions have been removed');
		});
	});
});
