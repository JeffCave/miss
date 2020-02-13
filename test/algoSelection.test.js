if(!global.Browser){
	require('./helper');
}

let ExpectedAlgos = [
	'smithwaterman',
	'smithwaterman-swAlgoCell',
	'smithwaterman-swAlgoGpu'
];

describe('Algorithm Selection', function() {
	it('all algos listed',Browser.use(async (browser)=>{
		let select = await browser.findElement(Browser.By.css('form select[name="algorithm"]'));
		let opts = await select.findElements(Browser.By.css('option'));
		opts = opts.map((opt)=>{
			return opt.getText();
		});
		opts = await Promise.all(opts);
		for(let algo of ExpectedAlgos){
			assert.include(opts,algo,'All options are present');
		}
		for(let algo of opts){
			assert.include(ExpectedAlgos,algo,'No extra options are present');
		}
	}));

	it('algo default is CPU',Browser.use(async (browser)=>{
		let select = await browser.findElement(Browser.By.css('form select[name="algorithm"]'));
		browser.sleep(1000);
		let text = await select.getAttribute('value');
		browser.sleep(1000);
		assert.equal(text,'smithwaterman-swAlgoCell','Default algorithm is CPU');

		// Select By Visible Text
		browser.sleep(1000);
		let opts = await select.findElements(Browser.By.css('option'));
		browser.sleep(1000);
		for(let opt of opts){
			browser.sleep(1000);
			let text = await opt.getText();
			browser.sleep(1000);
			if(text === 'smithwaterman'){
				browser.sleep(1000);
				opt.click();
				break;
			}
		}
		browser.sleep(1000);
		select = await browser.findElement(Browser.By.css('form select[name="algorithm"]'));
		browser.sleep(1000);
		text = await select.getAttribute('value');
		browser.sleep(1000);
		assert.equal(text,'smithwaterman-swAlgoCell','Selecting general algorithm results in CPU');
	}));

	it('GPU disabled on Firefox', async function(){
		let self = this;
		return Browser.run(async (browser)=>{
			if(browser.type !== 'firefox') return self.skip('Firefox not supported');
			let select = await browser.findElement(Browser.By.css('form select[name="algorithm"]'));
			let opt = await select.findElement(Browser.By.css('option[value="smithwaterman-swAlgoGpu"]'));
			let attr = await opt.getAttribute('disabled');
			assert.isNotNull(attr,'Enabled has been set');
		});
	});
});
