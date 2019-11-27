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
		let text = await select.getAttribute('value');
		assert.equal(text,'smithwaterman-swAlgoCell','Default algorithm is CPU');

		// Select By Visible Text
		let opts = await select.findElements(Browser.By.css('option'));
		for(let opt of opts){
			let text = await opt.getText();
			if(text === 'smithwaterman'){
				opt.click();
				break;
			}
		}
		text = await select.getAttribute('value');
		assert.equal(text,'smithwaterman-swAlgoCell','Selecting general algorithm results in CPU');
	}));

	it('GPU blocked on Firefox');
});
