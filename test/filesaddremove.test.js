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
		await files.sendKeys(path);
		await browser.sleep(5000);
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
	}).timeout(600000);

	it.skip('Remove Files', async function(){
		let self = this;
		return Browser.run(async (browser)=>{
			assert.fail('Not Implemented');
		});
	});

	it.skip('Remove All Files', async function(){
		let self = this;
		return Browser.run(async (browser)=>{
			assert.fail('Not Implemented');
		});
	});
});
