if(!global.Browser){
	require('./helper');
}

describe('Self Test', function() {
	this.timeout(30000);

	before(function() {
		// runs before all tests in this block
	});

	after(function() {
		// runs after all tests in this block
	});

	beforeEach(function() {
		// runs before each test in this block
	});

	afterEach(function() {
		// runs after each test in this block
	});

	it('can test', function() {
		assert.isTrue(true,'Basic Test harness running.');
	});

	it('can load a browser', Browser.use(async (browser)=>{
		let wait = Browser.until.titleMatches(/.*/);
		await browser.wait(wait, 1000);
		let title = await browser.getTitle();
		assert.isNotEmpty(title);
	}));

	it('page being served', Browser.use(async (browser)=>{
		let wait = Browser.until.titleMatches(/^MISS/);
		await browser.wait(wait, 1000);
		let title = await browser.getTitle();
		assert.isTrue(title.startsWith('MISS'),'Invalid start page');
	}));
});
