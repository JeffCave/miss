if(!global.Browser){
	require('./helper');
}

describe('User Options', function() {
	it('Title',Browser.use(async (browser)=>{
		let title = await browser.findElement(Browser.By.css('form input[name="title"]'));
		let disp = await title.isDisplayed();
		assert.isTrue(disp, "Title is visible");
	}));
	it('Notes');

	describe('Run Controls',function(){
		it('start');
		it('pause');
		it('reset');
	});

	describe('Comparison params',function(){

		const elements = [
			{name:'match',css:'score.match'},
			{name:'mismatch',css:'score.mismatch'},
			{name:'skip',css:'score.skip'},
			{name:'terminus',css:'score.terminus'},
			{name:'significant',css:'score.significant'},
		];

		for(elem of elements){
			describe(elem.name,function(){
				it(`exists`,Browser.use(async (browser)=>{
					let match = await browser.findElement(Browser.By.css(`form input[name="${elem.css}"]`));
					let disp = await match.isDisplayed();
					let type = await match.getAttribute('type');
					assert.isTrue(disp, `Score input is visible`);
					assert.strictEqual(type,'number','Type is numeric')
				}));

				it(`looks up values from deepdiff`,Browser.use(async (browser)=>{
					let deepdiff = await browser.executeScript('return window.index.runner');
					let scores = deepdiff.algo.scores;
					let e = await browser.findElement(Browser.By.css(`form input[name="${elem.css}"]`));
					let score = e.getValue();
					assert.strictEqual(scores.match,score,'Element is initialized to DeepDiff Value');
				}));
			})
		}

	});
});
