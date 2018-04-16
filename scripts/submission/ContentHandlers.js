'use script';

import {TokenList} from '../token/TokenList.js';

export const ContentHandlers = {
	defaultHandler:'text',
	ignores:['png','gif','jar','exe'],
	handlers:[
		{
			'type' : 'c',
			'ext' : ['c','h','cpp','hpp'],
			'tokenizer' : TokenList.TokenTypes.WHITESPACE
		},
		{
			'type' : 'dna',
			'ext' : ['fasta','dna'],
			'tokenizer' : TokenList.TokenTypes.CHARACTER
		},
		{
			'type' : 'js',
			'mime' : 'text/javascript',
			'ext' : ['js'],
			'tokenizer' : TokenList.TokenTypes.WHITESPACE
		},
		{
			'type' : 'text',
			'mime' : 'text/*',
			'ext' : ['txt'],
			'tokenizer' : TokenList.TokenTypes.WHITESPACE
		}
	]
};

ContentHandlers.defaultHandler = ContentHandlers.handlers.filter(function(d){return d.type === ContentHandlers.defaultHandler;})[0];
ContentHandlers.handlers.forEach(function(d){ContentHandlers.handlers[d.type] = d;});
