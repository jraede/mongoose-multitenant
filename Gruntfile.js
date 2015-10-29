
var f, semver, async, _;
var fs = require('fs');
semver = require('semver');
async = require('async');
_ = require('underscore');

f = require('util').format;
module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-sed');
	grunt.loadNpmTasks('grunt-contrib-coffee');
	grunt.initConfig({
		version: grunt.file.readJSON('package.json').version,
		watch: {
			coffee:{
				files:['coffee/**/*.coffee', 'coffee/*.coffee'],
				tasks:['coffee']
			}
		},
		exec:{
			test: {
				cmd:function(ex) {
					return f('NODE_ENV=test mocha %s', ex)
				}
			}
			
		},
		coffee: {
			source:{
				options:{
					preserve_dirs:true,
					bare:true
				},
				files:[
					{
						expand:true,
						flatten:false,
						cwd:'coffee',
						src:['*.coffee','**/*.coffee'],
						dest:'',
						ext:'.js'
					}
				]
			}
		}
	});

	grunt.registerTask('dropTestDb', function() {
		var mongoose = require('mongoose');
		var done = this.async();

		async.series(_.map([
			'mongodb://localhost/multitenant_test_one',
			'mongodb://localhost/multitenant_test_two',
			'mongodb://localhost/multitenant_test'
		], function(db){
			return function(cb){
				mongoose.connect(db, function(){
					mongoose.connection.db.dropDatabase(function(err){
						if(err){
							console.log(err);
						}else{
							console.log('Successfully dropped %s', db);
						}
						mongoose.connection.close(cb);
					});
				});
			};
		}), function(err){
			done();
		});
	});

	grunt.registerTask('test', 'Run tests', function(test) {
		var tasks = []
		var files = fs.readdirSync('test');
		var file;

		if(test) {
			tasks.push('exec:test:"test/' + test + '.js' + '"')
			tasks.push('dropTestDb')
		}
		else {
			for(var i=0;i<files.length;i++) {
				file = files[i];
				tasks.push('exec:test:"test/' + file + '"')
				tasks.push('dropTestDb')
			}
		}
		
		grunt.task.run(tasks);
	});
};
