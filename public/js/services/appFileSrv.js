app.factory("AppFileSrv", function ($interval, $q, $once, globalContent, Config) {
	var PREFIX = "scripts/vscripts";

	var _interval;
	var FS = require("fs");
	var PATH = require("path");
	var AppFileSrv = function () {
	};
	AppFileSrv.fileMatchList = [];

	// ==========================================================
	// =                        V Script                        =
	// ==========================================================
	// List files
	function listFiles(path) {
		FS.readdir(path, function(err, files) {
			if(err) return;

			$.each(files, function(i, file) {
				var tmpPath = PATH.normalize(path + '/' + file);
				var stats = FS.statSync(tmpPath);

				if (stats.isDirectory()) {
					listFiles(tmpPath);
				} else {
					var _purePath = tmpPath.replace(globalContent.project, "").slice(1);
					_purePath = _purePath.replace(/\\/g, "/");

					if(!Config.global.typeaheadFuncPrefix) {
						_purePath = _purePath.replace(PREFIX + "/", "");
					}

					AppFileSrv.fileMatchList.push({
						value: _purePath
					});
				}
			});
		});
	}

	AppFileSrv.check = function() {
		var _path = PATH.normalize(globalContent.project + "/" + PREFIX);
		AppFileSrv.fileMatchList = [];
		listFiles(_path);
	};

	// Watching
	AppFileSrv.stopWatch = function() {
		$interval.cancel(_interval);
	};
	AppFileSrv.watchFolder = function() {
		AppFileSrv.stopWatch();

		AppFileSrv.check();
		_interval = $interval(function() {
			if(!Config.global.loopCheckFolder) return;
			AppFileSrv.check();
		}, 5000);
	};

	// Prepare function list
	AppFileSrv.prepareFuncMatchCache = {};
	AppFileSrv.prepareFuncMatchList = function(path) {
		var _path = globalContent.project + "/";
		if(!Config.global.typeaheadFuncPrefix) {
			_path = _path + PREFIX + "/";
		}
		_path = PATH.normalize(_path + path);

		$once("fileFuncQuery_" + path, function() {
			FS.readFile(_path, "utf8", function (err, data) {
				if(!err) {
					var matchList = data.match(/function\s+[^\s^\(]+/g);
					AppFileSrv.prepareFuncMatchCache[path] = $.map(matchList, function(line) {
						return {
							value: line.match(/function\s+(.*)/)[1]
						};
					});
				}
			});
		}, 5000);

		return AppFileSrv.prepareFuncMatchCache[path] || [];
	};

	// ==========================================================
	// =                       File System                      =
	// ==========================================================
	// File exist
	AppFileSrv.fileExist = function(path) {
		path = PATH.normalize(path);
		return FS.existsSync(path);
	};

	// Assume folder
	AppFileSrv.assumeFolder = function(path) {
		path = PATH.normalize(path);
		if(!FS.existsSync(path)) {
			AppFileSrv.assumeFolder(PATH.dirname(path));
			FS.mkdirSync(path);
		}
	};

	// List path
	AppFileSrv.listFiles = function(path, filter, recv) {
		var _deferred = $q.defer();
		var _list = [];
		var _recv = recv !== false && recv !== undefined;
		var _deepPath = typeof recv === "string" ? recv : "";

		path = PATH.normalize(path);
		if(!FS.existsSync(path)) {
			return {
				success: false,
				msg: "Folder not exist!",
				list: _list
			};
		}
		if(!FS.statSync(path).isDirectory()) {
			return {
				success: false,
				msg: "Not a folder!",
				list: _list
			};
		}

		_list = FS.readdirSync(path);

		switch (filter) {
			case "folder":
			case "directory":
				_list = $.map(_list, function(file) {
					if(FS.statSync(PATH.normalize(path + "/" + file)).isDirectory()) {
						return PATH.normalize(_deepPath + file);
					}
				});
				break;
			case "file":
				_list = $.map(_list, function(file) {
					if(FS.statSync(PATH.normalize(path + "/" + file)).isFile()) {
						return PATH.normalize(_deepPath + file);
					} else if(_recv) {
						var _subList = AppFileSrv.listFiles(path + "/" + file, filter, file + "/");
						if(_subList.success && _subList.list.length) return _subList.list;
					}
				});
				break;
			default:
				if(filter instanceof RegExp) {
					_list = $.map(_list, function(file) {
						if(filter.test(file)) {
							return PATH.normalize(_deepPath + file);
						}
					});
				}
		}

		return {
			success: true,
			list: _list
		};
	};
	//循环遍历所有文件，只会返回文件。filter只能是正则表达式。如果不是，则不进行校验
	AppFileSrv.listFilesTravels = function(path, filterReg,recv) {
		var _deferred = $q.defer();
		var _list = [];
		var _deepPath = typeof recv === "string" ? recv : "";

		path = PATH.normalize(path);
		if(!FS.existsSync(path)) {
			return {
				success: false,
				msg: "Folder not exist!",
				list: _list
			};
		}
		if(!FS.statSync(path).isDirectory()) {
			return {
				success: false,
				msg: "Not a folder!",
				list: _list
			};
		}

		_list = FS.readdirSync(path);

		_list = $.map(_list, function(file) {
			if(FS.statSync(PATH.normalize(path + "/" + file)).isFile()) {//如果是文件，就判断是否符合正则表达式
				if(filterReg instanceof RegExp){
					if(filterReg.test(file)) {
						//return PATH.normalize(_deepPath+file);
						return _deepPath+file;
					}
				}else{
					//return PATH.normalize(_deepPath+file);
					return _deepPath+file;
				}
				
			} else {//如果是目录，就遍历所有子级
				var _subList = AppFileSrv.listFilesTravels(path + "/" + file, filterReg, _deepPath+file + "/");
				if(_subList.success && _subList.list.length) return _subList.list;
			}
		});

		return {
			success: true,
			list: _list
		};
	};

	// Write file
	AppFileSrv.readFile = function(path, encoding) {
		var _deferred = $q.defer();

		FS.readFile(path, encoding || "utf8", function (err, data) {
			if(err) {
				_deferred.reject(err);
			} else {
				_deferred.resolve(data);
			}
		});

		return _deferred.promise;
	};

	// Write file
	AppFileSrv.writeFile = function(path, data, encoding) {
		var _deferred = $q.defer();

		path = PATH.normalize(path);
		encoding = encoding || "utf8";
		if(encoding === "ucs2") {
			data = "\ufeff" + data;
		}
		FS.writeFile(path, data, encoding, function (err) {
			if(err) {
				_deferred.reject(err);
			} else {
				_deferred.resolve();
			}
		});

		return _deferred.promise;
	};

	// Copy file
	AppFileSrv.copyFile = function (src, tgt) {
		var srcFile, tgtFile;
		var FS = require("fs");
		var _deferred = $q.defer();

		var _folder = tgt.match(/(.*)[\\\/].*/)[1];
		AppFileSrv.assumeFolder(_folder);

		srcFile = FS.createReadStream(src);
		tgtFile = FS.createWriteStream(tgt);

		srcFile.on("error", function(err) {
			_deferred.reject(err);
		});
		tgtFile.on("error", function(err) {
			_deferred.reject(err);
		});
		tgtFile.on("close", function() {
			_deferred.resolve(tgt);
		});

		srcFile.pipe(tgtFile);

		return _deferred.promise;
	};

	return AppFileSrv;
});