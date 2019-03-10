(function(){

'use strict';

module.exports = function(grunt) {
	//const fs = require('fs');

	grunt.initConfig({});

	grunt.config.merge({
		target: (function(){
			var targ = '';
			try {
				targ = JSON.parse(process.env.deployment);
			}
			catch (e) {
				targ = {
					port: process.env.PORT || 5964,
					hostname: 'lvh.me',
					db:'patreon',
					protocol:'http',
				};
			}
			targ.url = targ.protocol + '://' + targ.hostname + ':' + targ.port + '/';
			return targ;
		})(),
		isProd : (process.env.isProd == 'true')
	});
	
	grunt.config.merge({
		checkDependencies: {
			this: {
				options: {
					install: true,
				},
			},
		},
		jshint: {
			files: ['Gruntfile.js', 'www/**/*.js', 'patreon/**/*.js'],
			options: {
				ignores: [
				],
				esversion: 6,
				evil:true,
				//strict : 'implied',
				laxcomma: true,
				//varstmt: true,
				globals: {
					couch: true
				}
			}
		},
		watch: {
			files: ['<%= jshint.files %>'],
			tasks: ['build']
		},
		'couch-compile': {
			app: {
				files: {
					'bin/patreon.json': 'patreon/patreon'
				}
			}
		},
		'couch-push': {
			app: {
				options: grunt.config.process('<%= target %>'),
				files: (()=>{
					var f = {};
					f[grunt.config.get('target').url + 'patreon'] = [
							'bin/patreon.json'
						];
					return f;
				})()
			}
		},
		mochaTest: {
			test: {
				options: {
					//reporter: 'spec',
					reporter: 'landing',
					quiet: false, // Optionally suppress output to standard out (defaults to false) 
					clearRequireCache: false // Optionally clear the require cache before running tests (defaults to false) 
				},
				src: ['test/**/*.js']
			}
		}
	});


	grunt.loadNpmTasks('grunt-check-dependencies');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-couch');
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-mocha-test');

	grunt.registerTask('default', ['build']);
	grunt.registerTask('test', ['mochaTest']);
	grunt.registerTask('config', [
		'checkDependencies'
	]);
	grunt.registerTask('build', ['deploy']);
	grunt.registerTask('deploy', [
		//'checkDependencies',
		//'jshint',
		'couch-compile',
		'secretkeys',
		'couch-push'
	]);
	
	grunt.task.registerTask('secretkeys', 'Replace various keys', function() {
		var secrets;
		//grunt.log.write('HERE:'+ JSON.stringify(JSON.parse(process.env.oauthKeys),null,4) + '\n');
		try{
			secrets = JSON.parse(process.env.secrets);
		}
		catch(e){
			secrets = {patreon:{}};
		}
		var replaces = {
			'==secrets.patreon.TokenFromUs==':secrets.patreon.TokenFromUs || '==secrets.patreon.TokenFromUs==',
			'==secrets.patreon.TokenFromThem==':secrets.patreon.TokenFromThem || '==secrets.patreon.TokenFromThem==',
		};
		const child = require('child_process');
		grunt.file.expand('bin/**/*.json').forEach(function(file) {
			grunt.log.write(`${file} \n`);
			for(let key in replaces){
				grunt.log.write(` - ${key} \n`);
				let orig = key.replace(/~/g,'\\~');
				let n = replaces[key];
				let cmd = 'sed -i s~{{orig}}~{{new}}~g {{file}}'
					.replace(/{{file}}/g,file)
					.replace(/{{orig}}/g,orig)
					.replace(/{{new}}/g,n.replace(/~/g,'\\~'))
					;
				//grunt.log.write(` ${cmd} \n`);
				child.execSync(cmd);
			}
		});
	});

};


})();
