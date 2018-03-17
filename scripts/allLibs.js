'use strict';

const loader = {
	loaded:[],
	load:function(libs){
		if(!Array.isArray(libs)){
			libs = [libs];
		}
		libs.forEach(function(lib){
			if(0 <= loader.loaded.indexOf(lib)) {
				return;
			}

			let elem = document.createElement('script');
			elem.type='text/javascript';
			elem.src = lib;
			elem.async = true;
			try{
				document.head.append(elem);
				loader.loaded.push(lib);
			}
			catch(e){
				console.error('Failed to load: ' + e.message);
			}
		});
	}
};

(function(){
	loader.load([
			,'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js'
			,'/scripts/algorithm/linesimilarity/LineSimilarityChecker.js'
			,'/scripts/algorithm/preprocessor/CommonCodeLineRemovalPreprocessor.js'
			,'/scripts/algorithm/preprocessor/PreprocessorRegistry.js'
			,'/scripts/algorithm/preprocessor/PreprocessSubmissions.js'
			,'/scripts/algorithm/preprocessor/SubmissionPreprocessor.js'
			,'/scripts/algorithm/similaritymatrix/output/MatrixPrinterRegistry.js'
			,'/scripts/algorithm/similaritymatrix/SimilarityMatrix.js'
			,'/scripts/algorithm/linesimilarity/LineSimilarityChecker.js'
			,'/scripts/algorithm/AlgorithmRegistry.js'
			,'/scripts/submission/Submission.js'
			,'/scripts/submission/ValidityIgnoringSubmission.js'
			,'/scripts/token/tokenizer/Tokenizer.js'
			,'/scripts/token/TokenType.js'
			,'/scripts/token/TokenList.js'
			,'/scripts/util/reflection/RegistryWithDefault.js'
			,'/scripts/util/PairGenerator.js'
			,'/scripts/util/misc.js'
			,'/scripts/ChecksimsException.js'
			,'/scripts/ChecksimsRunner.js'
		]);
})();
