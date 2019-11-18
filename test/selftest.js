if(!global.Browser){
	require('./helper');
}

describe('Self Test', function() {
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
		await browser.get('http://lvh.me:3030');
		let title = await browser.getTitle();
		assert.notEmpty(title);
	}));

	it('page being served', Browser.use(async (browser)=>{
		await browser.get('http://lvh.me:3030');
		let title = await browser.getTitle();
		assert.isTrue(title.startsWith('MISS'),'Invalid start page');

	}));
});
