module.exports = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		requirejs: {
			compile:{
				options:{
					optimize: 'none',
					baseUrl: "public/js",
				    name: "bootstrap",
					paths: {
						jquery: "../../bower_components/jquery/jquery",
						angular: "../../bower_components/angular/angular",
						angularRoute: "../../bower_components/angular-route/angular-route"
					},
					shim: {
						angularRoute: {
							deps: ['angular'],
						 	attach: 'angularRoute'
						}
					},
				    out: "build/<%= pkg.appName %>.require.js",
					findNestedDependencies: true,
					removeCombined: true
				}
			}
		},
		concat: {
			options:{
				separator: ";"
			},
			dist:{
				src: [
					'node_modules/requirejs/require.js',
					'build/<%= pkg.appName %>.require.js',
				],
				dest: 'public/build/<%= pkg.appName %>.final.js'
			}
		},
		uglify: {
			options:{
				mangle: true,
				compress: true
			},
			dist: {
				files: {
					'public/build/<%= pkg.appName %>.min.js': ['<%= concat.dist.dest %>']
				}
			}
		},
		clean: {
			src: ['build']
		}
	});


	for (var ii in grunt.config().pkg.devDependencies){grunt.loadNpmTasks(ii);}
	grunt.registerTask("default",['requirejs','concat', 'uglify', 'clean']);
}