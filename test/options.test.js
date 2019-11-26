if(!global.Browser){
	require('./helper');
}

describe('User Options', function() {
	it('Title');
	it('Notes');

	describe('Run Controls',function(){
		it('start');
		it('pause');
		it('reset');
	})

	describe('Comparison params',function(){
		it('match');
		it('mismatch');
		it('skippable');
		it('terminus');
		it('significant');
	});
});
