'use script';

import {TokenList} from '../token/TokenList.js';

export const ContentHandlers = {
	defaultHandler:'text',
	ignores:[
		// ignore system files and folders
		/\/\./, /\/__MACOSX\//,
		],
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

/**
 * Extensions are a ~~reasonable~~ tolerable mechanism for identifying files
 * we don't want to process.
 *
 * What follows is an attempt to add a bunch of known extensions to the
 * ignore list, convert them to RegExp, and then filter them for uniqueness.
 *
 * It may be better to include a 'supported' list rather than an ignore list
 */

[
	// Image files
	'bmp','png','gif','jpg','jpeg',
	// Video
	'mpg','mpeg',
	// Audio
	// Compression
	'l7','rar','zip',
	// encrypted
	'gpg',
	// libraries and executables
	'jar','exe','dll','suo'
].forEach(function(ext){
	let pattern = "\\." + ext + '$';
	pattern = new RegExp(pattern,'i');
	ContentHandlers.ignores.push(pattern);
});

//ContentHandlers.ignores = (new Set(ContentHandlers.ignores)).values();
