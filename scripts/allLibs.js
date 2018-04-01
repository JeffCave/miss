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
			elem.src = lib; // + '?nocache';
			elem.defer = true;
			try{
				//console.log('Loading Library: ' + lib);
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
	loader.realLoad = loader.load;
	loader.load = function(){};
	loader.realLoad([
			,'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.5/require.min.js'
			//,'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js'
			//,'https://cdnjs.cloudflare.com/ajax/libs/jsSHA/2.3.1/sha.js'
			//,'https://cdnjs.cloudflare.com/ajax/libs/mustache.js/2.3.0/mustache.min.js'
			/**
			 * Order of loading is significant. Ensure that the libraries load
			 * in dependant order
			 */
			,'/scripts/util/reflection/NamedInstantiable.js'
			,'/scripts/util/reflection/Registry.js'
			,'/scripts/algorithm/SimilarityDetector.js'
			,'/scripts/algorithm/preprocessor/SubmissionPreprocessor.js'
			,'/scripts/visualizations/similaritymatrix/MatrixEntry.js'
			,'/scripts/util/reflection/RegistryWithDefault.js'
			,'/scripts/token/Token.js'
			,'/scripts/algorithm/linesimilarity/LineSimilarityChecker.js'
			,'/scripts/visualizations/similaritymatrix/output/MatrixPrinter.js'
			,'/scripts/submission/Submission.js'

			,'/scripts/algorithm/preprocessor/CommonCodeLineRemovalPreprocessor.js'
			,'/scripts/algorithm/preprocessor/PreprocessorRegistry.js'
			,'/scripts/algorithm/preprocessor/PreprocessSubmissions.js'
			,'/scripts/algorithm/smithwaterman/ArraySubset.js'
			,'/scripts/algorithm/smithwaterman/Coordinate.js'
			,'/scripts/algorithm/smithwaterman/SmithWatermanAlgorithm.js'
			,'/scripts/algorithm/smithwaterman/SmithWaterman.js'
			,'/scripts/algorithm/AlgorithmRegistry.js'
			,'/scripts/algorithm/AlgorithmResults.js'
			,'/scripts/algorithm/AlgorithmRunner.js'
			,'/scripts/submission/ValidityIgnoringSubmission.js'
			,'/scripts/token/tokenizer/Tokenizer.js'
			,'/scripts/token/tokenizer/CharTokenizer.js'
			,'/scripts/token/tokenizer/WhitespaceTokenizer.js'
			,'/scripts/token/tokenizer/LineTokenizer.js'
			,'/scripts/token/AbstractTokenDecorator.js'
			,'/scripts/token/LexemeMap.js'
			,'/scripts/token/TokenType.js'
			,'/scripts/token/TokenList.js'
			,'/scripts/token/Token.js'
			,'/scripts/token/ValidityIgnoringToken.js'
			,'/scripts/visualizations/similaritymatrix/output/MatrixToHTMLPrinter.js'
			,'/scripts/visualizations/similaritymatrix/output/MatrixToCSVPrinter.js'
			,'/scripts/visualizations/similaritymatrix/output/MatrixPrinterRegistry.js'
			,'/scripts/visualizations/similaritymatrix/SimilarityMatrix.js'

			,'/scripts/util/PairGenerator.js'
			,'/scripts/util/misc.js'
			,'/scripts/ChecksimsException.js'
			,'/scripts/ChecksimsConfig.js'
			,'/scripts/ChecksimsRunner.js'
		]);
})();
