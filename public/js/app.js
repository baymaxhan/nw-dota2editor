﻿'use strict';

/* App Module */
var APP_APP_NAME = "Dota2 Editor";
var APP_APP_AUTHOR = "zombieJ";
var APP_APP_GITHUB = "https://github.com/zombieJ/nw-dota2editor";

var app = angular.module('app', ['ngRoute', 'hammerControllers', 'app.components', 'ui.sortable', 'ui.bootstrap']);

app.config(function ($routeProvider) {
	$routeProvider.when('/index', {
		templateUrl: 'partials/index.html',
		controller: 'indexCtrl'
	}).when('/unit', {
		templateUrl: 'partials/unit.html',
		controller: 'unitCtrl'
	}).when('/hero', {
		templateUrl: 'partials/unit.html',
		controller: 'heroCtrl'
	}).when('/ability', {
		templateUrl: 'partials/ability.html',
		controller: 'abilityCtrl'
	}).when('/item', {
		templateUrl: 'partials/ability.html',
		controller: 'itemCtrl'
	}).when('/language', {
		templateUrl: 'partials/language.html',
		controller: 'languageCtrl'
	}).when('/kv', {
		templateUrl: 'partials/kv.html',
		controller: 'kvCtrl'
	}).when('/config', {
		templateUrl: 'partials/config.html',
		controller: 'configCtrl'
	}).otherwise({
		redirectTo: '/index'
	});
});

app.factory("globalContent", function (Config) {
	var _globalContent = {
		inlineMode: !window.require,

		isOpen: false,

		abilityList: null,
		itemList: null,

		abilityConfig: null,
		itemConfig: null,

		languageList: [],
		currentLanguage: null,

		system: {
			hideMenu: true,
		},
	};

	// Update config
	_globalContent.project = Config.projectList[0] || "";

	// Get main language
	_globalContent.mainLang = function () {
		return common.array.find(Config.global.mainLang, _globalContent.languageList, "name", false, false) || _globalContent.languageList[0];
	};

	// Hot key
	_globalContent.hotKey = function($scope, funcMapping) {
		$(document).on("keydown.globalSave", function(e) {
			if(e.ctrlKey && e.which === 83) {
				$("#saveProject").click();
			}
		});

		$(document).on("keydown.global", function(e) {
			if(e.ctrlKey) {
				var _key = (String.fromCharCode(e.which) || "").toUpperCase();
				if(funcMapping[_key]) {
					// Hot key
					funcMapping[_key](e);
					$scope.$apply();
				} else if(_key === 'H') {
					// Help list
					var $div = $("<div>");
					$.each(funcMapping, function(key, func) {
						if(/^_\w/.test(key)) return;

						$div.append(
							$("<p>")
								.append("<label>Ctrl + " + key + ":</label> ")
								.append("<span>" + funcMapping["_" + key] + "</span>")
						);
					});

					$.dialog({
						title: "Hot Key List",
						content: $div
					});
				}
			}

			if(window._DEBUG) {
				console.log(e.which, e);
			}
		});

		$scope.$on("$destroy",function() {
			$(document).off("keydown.global");
		});
	};

	return _globalContent;
});

app.factory("NODE", function ($http, globalContent) {
	if (window.process) {
		return window.process.mainModule.exports;
	} else if (globalContent.inlineMode) {
		var _fakeNode = {};

		// init
		_fakeNode.init = $.noop;

		// Fake load
		_fakeNode.loadFile = function (path) {
			_LOG("FAKE", 0, "Load file:", path);

			return $http.get("fake/" + path).then(function (data) {
				return data.data;
			});
		};

		return _fakeNode;
	}
	return null;
});

app.factory("FS", function () {
	if (window.require) {
		return require("fs");
	} else {
		return null;
	}
});

app.factory("PATH", function () {
	if (window.require) {
		return require("path");
	} else {
		return null;
	}
});

app.factory("UI", function ($rootScope, Locale) {
	var UI = function () {
	};

	UI.highlight = function(element, path) {
		setTimeout(function () {
			element = $(element);
			if(path) element = element.find(path);
			element = element.find('input,textarea,select').filter(':visible:first').focus();
			UI.moveTo(element);
		}, 100);
		return element;
	};

	UI.moveTo = function(element) {
		var _winTop = $(window).scrollTop();
		var _winHeight = $(window).height();
		var _winBottom = _winTop + _winHeight;
		var _top = $(element).offset().top;
		var _height = $(element).height();
		var _bottom = _top + _height;

		if(_top < _winTop + 50) {
			$(window).scrollTop(_top + 50);
		} else if(_bottom > _winBottom) {
			$(window).scrollTop(_top - _winHeight + _height);
		}
	};

	// Delete item from an array
	UI.arrayDelete = function (item, array, callback) {
		$.dialog({
			title: "Delete Confirm",
			content: "Are you sure to delete?",
			confirm: true
		}, function (ret) {
			if (!ret) return;

			common.array.remove(item, array);
			if (callback) callback(item);
			$rootScope.$apply();
		});
	};

	UI.modal = function (element) {
		UI.modal.highlight($(element).modal());
	};
	UI.modal.highlight = function (element, delay) {
		setTimeout(function () {
			$(element).find("input:not([disabled]):first").focus();
		}, delay || 500);
		return element;
	};

	UI.modal.rename = function (entity, check, callback) {
		var _oldName = entity._name;
		var $input = $("<input type='text' class='form-control' />").val(_oldName);
		var $content = $("<div>")
			.append("<label>" + Locale('OldName') + "</label>")
			.append("<p>" + entity._name + "</p>")
			.append("<label>" + Locale('NewName') + "</label>")
			.append($input);
		var $mdl = UI.modal.highlight($.dialog({
			title: Locale('Rename'),
			content: $content,
			confirm: true
		}, function (ret) {
			if (!ret) return;

			var _dlg = this;
			var _newName = $input.val().trim();
			var _checkResult = check ? check(_newName, entity) : true;

			function _changeName() {
				entity._name = _newName;
				if (callback) {
					callback(_newName, _oldName, entity);
				}
				$rootScope.$apply();
			}

			if (_checkResult === true) {
				_changeName();
			} else if(_checkResult.type === "confirm") {
				$.dialog({
					title: "Confirm",
					content: _checkResult.msg,
					confirm: true
				}, function(ret) {
					if(!ret) return;
					_changeName();
					$mdl.modal('hide');
				});
				return false;
			} else {
				$.dialog({
					title: "OPS",
					content: _checkResult
				}, function () {
					UI.modal.highlight(_dlg);
				});
				return false;
			}
		}));
	};

	UI.modal.input = function (title, description, defaultValue, callback) {
		description = $.isArray(description) ? description : [description];
		if(typeof defaultValue === "function") {
			callback = defaultValue;
			defaultValue = [];
		}
		defaultValue = $.isArray(defaultValue) ? defaultValue : [defaultValue];

		var $content = $("<div>");
		var $inputList = $.map(description, function(key, i) {
			$content.append("<label>" + key + "</label>");
			return $("<input type='text' class='form-control' />").val(defaultValue[i] || "").appendTo($content);
		});

		UI.modal.highlight($.dialog({
			title: title,
			content: $content,
			confirm: true
		}, function (ret) {
			if (!ret) return;

			if (callback) {
				var _val = $.map($inputList, function($input) {
					return $input.val();
				});
				var _ret = callback.apply(this, _val);
				$rootScope.$apply();
				return _ret;
			}
		}));
	};

	return UI;
});

app.controller('main', function ($scope, $route, $location, $q,
	UI, Locale, Ability, Event, Operation, Modifier, Unit, Language, KV, Sound, globalContent, NODE, Config, Sequence,
	AppVersionSrv, AppFileSrv, AppImageSrv, AppSpellLibSrv) {
	window._DEBUG = false;
	window.globalContent = $scope.globalContent = globalContent;
	window.Locale = $scope.Locale = Locale;
	window.Ability = $scope.Ability = Ability;
	window.Event = $scope.Event = Event;
	window.Operation = $scope.Operation = Operation;
	window.Modifier = $scope.Modifier = Modifier;
	window.Language = $scope.Language = Language;
	window.Sound = $scope.Sound = Sound;
	window.Unit = $scope.Unit = Unit;
	window.UI = $scope.UI = UI;
	window.KV = $scope.KV = KV;
	window.Config = $scope.Config = Config;
	window.Sequence = $scope.Sequence = Sequence;
	window.AppVersionSrv = $scope.AppVersionSrv = AppVersionSrv;
	window.AppFileSrv = $scope.AppFileSrv = AppFileSrv;
	window.AppImageSrv = $scope.AppImageSrv = AppImageSrv;
	window.AppSpellLibSrv = $scope.AppSpellLibSrv = AppSpellLibSrv;
	window._NODE = $scope.NODE = NODE;
	$scope.common = common;
	$scope.jQuery = $;

	window.GC = $scope.globalContent = $scope.GC = globalContent;

	var FS = require("fs");
	var PATH = require('path');

	// 保存时间
	var _saveBackUpPath;

	NODE && NODE.init(globalContent, $q);

	$scope.navSelected = function (path) {
		return path === $location.path();
	};

	// 载入项目
	$scope.loadProject = function () {
		var _promise = NODE.loadProject(globalContent.project);

		_promise.then(function () {
			Config.addProjectPath(globalContent.project);
			globalContent.isOpen = true;

			// 总是读取多语言文件
			var _listFilesPromise = NODE.listFiles(Language.folderPath, Language.fileNameRegex);
			globalContent.languageList._promise = _listFilesPromise;
			_listFilesPromise.then(function (fileList) {
				common.array.replace(globalContent.languageList, $.map(fileList, function (fileName) {
					return new Language(fileName);
				}));
				// Set default language
				globalContent.currentLanguage = common.array.find(Config.global.mainLang, globalContent.languageList, "name", false, false) || globalContent.languageList[0];
			}, function () {
				common.array.replace(globalContent.languageList, []);
			}).finally(function () {
				$route.reload();
			});

			//$route.reload();
		}, function () {
			$.dialog({
				title: "OPS!",
				content: "Project folder not exist!<br>【文件路径不存在！】",
			});
		});
	};

	// 测试模式
	$scope.inlineMode = function () {
		globalContent.isOpen = true;

		var _langSChinese = new Language("addon_schinese.txt");
		globalContent.languageList = [_langSChinese];
		globalContent.languageList._promise = _langSChinese._promise;

		$route.reload();
	};

	// 保存项目
	function saveUnitFunc(isHero) {
		return function () {
			var _deferred_file = $q.defer();
			var _deferred_config = $q.defer();
			var _globalListKey = isHero ? "heroList" : "unitList";
			var _globalConfigKey = isHero ? "heroConfig" : "unitConfig";
			var _filePath = isHero ? Unit.heroFilePath : Unit.filePath;

			// Backup
			if(_saveBackUpPath && Config.global.saveBackUp) {
				Config.copyFile(_filePath, _saveBackUpPath + "/" + _filePath.replace(/^.*\/(.*)/, "$1"));
			}

			// File
			if (!globalContent[_globalListKey]) {
				_deferred_file.resolve(4);
			} else {
				var _writer = new KV.Writer();
				_writer.writeBase(globalContent[_globalListKey+"_base"])

				if (isHero) {
					_writer.withHeader("DOTAHeroes", {});
				} else {
					_writer.withHeader("DOTAUnits", {});
				}

				$.each(globalContent[_globalListKey], function (i, ability) {
					_writer.write('');
					ability.doWriter(_writer);
					ability._changed = false;
				});
				_writer.withEnd();

				_writer.save(_filePath, "utf8", _deferred_file);
			}

			// Config
			if (!globalContent[_globalConfigKey]) {
				_deferred_config.resolve(4);
			} else {
				_deferred_config = NODE.saveFile(isHero ? Unit.heroConfig : Unit.unitConfig, "utf8", JSON.stringify(globalContent[_globalConfigKey], null, "\t"));
			}

			var _deferred_all = $q.all([_deferred_file.promise, _deferred_config.promise]).then(function (result) {
				return result[0];
			});

			return _deferred_all;
		};
	}

	function saveAbilityFunc(isItem) {
		return function () {
			var _deferred_file = $q.defer();
			var _deferred_config = $q.defer();
			var _globalListKey = isItem ? "itemList" : "abilityList";
			var _filePath = isItem ? Ability.exportItemFilePath : Ability.exportFilePath;
			var _config = Config.fetch(isItem ? "item" : "ability");

			// Backup
			if(_saveBackUpPath && Config.global.saveBackUp) {
				Config.copyFile(_filePath, _saveBackUpPath + "/" + _filePath.replace(/^.*\/(.*)/, "$1"));
			}

			// File
			if (!globalContent[_globalListKey]) {
				_deferred_file.resolve(4);
			} else {
				var _writer = new KV.Writer();
				_writer.writeBase(globalContent[_globalListKey+"_base"])
				_writer.withHeader("DOTAAbilities", {});

				$.each(globalContent[_globalListKey], function (i, ability) {
					_writer.write('');
					ability.doWriter(_writer);
					ability._changed = false;
				});
				_writer.withEnd();

				_writer.save(_filePath, "utf8", _deferred_file);
			}

			// Config
			if($.isEmptyObject(_config._data)) {
				_deferred_config.resolve(4);
			} else {
				_deferred_config = NODE.saveFile(isItem ? Ability.itemConfig : Ability.abilityConfig, "utf8", JSON.stringify(_config.exportData(), null, "\t"));
			}

			var _deferred_all = $q.all([_deferred_file.promise, _deferred_config.promise]).then(function (result) {
				return result[0];
			});

			return _deferred_all;
		};
	}

	$scope.saveMSG = "";
	$scope.saveLock = false;
	$scope.saveFileList = [
		// ===================================================================
		// =                          保存 【单位】                          =
		// ===================================================================
		{name: "Unit", desc: "单位", selected: false, saveFunc: saveUnitFunc(false)},

		// ===================================================================
		// =                          保存 【英雄】                          =
		// ===================================================================
		{name: "Hero", desc: "英雄", selected: false, saveFunc: saveUnitFunc(true)},

		// ===================================================================
		// =                          保存 【技能】                          =
		// ===================================================================
		{name: "Ability", desc: "技能", selected: false, saveFunc: saveAbilityFunc(false)},

		// ===================================================================
		// =                          保存 【物品】                          =
		// ===================================================================
		{name: "Item", desc: "物品", selected: false, saveFunc: saveAbilityFunc(true)},

		// ===================================================================
		// =                          保存 【语言】                          =
		// ===================================================================
		{
			name: "Language", desc: "语言", selected: false, saveFunc: function () {
			var _deferred = $q.defer();
			var _saveLangCount = 0;

			if (!globalContent.languageList || !globalContent.languageList.length) {
				_deferred.resolve(4);
			} else {
				var _promiseList = [];

				$.each(globalContent.languageList, function (i, language) {
					var _writer = new KV.Writer();
					if(!language._oriKV) {
						_ERROR("Language",0, "File not provide origin KV!", language.name, language);
						return;
					}
					_writer.writeBase(language._oriKV._base)
					
					var _filePath = Language.folderPath + "/" + language.fileName.replace(/^_/, "").replace(/\.bac/, "");
					_saveLangCount += 1;
					
					//语言文件不保留空串
					language._oriKV.saveBlankString = false
					_writer.writeContent(language._oriKV.toString());

					// Backup
					if(_saveBackUpPath && Config.global.saveBackUp) {
						Config.copyFile(_filePath, _saveBackUpPath + "/" + _filePath.replace(/^.*\/(.*)/, "$1"));
					}

					// File
					_promiseList.push(_writer.save(_filePath, "utf8",null,true));
					$q.all(_promiseList).then(function () {
						_deferred.resolve();
					}, function () {
						_deferred.reject();
					});
				});

				if(_saveLangCount === 0) {
					_deferred.reject();
				}
			}
			return _deferred.promise;
		}
		}
	];


	// 保存文件
	// 状态码：0 初始化；1 运行中；2 成功；3 失败；4 未变更
	$scope.saveFiles = function () {
		var _date = new moment();
		var _promiseList = [];
		$scope.saveLock = true;

		console.log("Do Save...");
		// Back Up
		try {
			if (Config.global.saveBackUp) {
				// Clean up old backup
				console.log("BackUp clean...");
				var folderList = Config.listFiles(".dota2editor/backup");
				folderList.sort();
				while (folderList.length >= 10) {
					var _oldBackUp = folderList.shift();
					Config.deleteFile(".dota2editor/backup/" + _oldBackUp);
				}

				// Create folder
				console.log("Create Backup Folder...");
				_saveBackUpPath = ".dota2editor/backup/" + _date.format("YYYYMMDD_HHmmSS");
				Config.assumeFolder(_saveBackUpPath);
			} else {
				_saveBackUpPath = null;
			}
		} catch(err) {
			$.dialog({
				title: Locale('Error'),
				content: Locale('backupError')
			});
			console.error(err);
		}

		console.log("Do Save Order...");
		$.each($scope.saveFileList, function (i, saveItem) {
			if (!saveItem.selected || !saveItem.saveFunc) return;

			saveItem.status = 1;
			var _promise = saveItem.saveFunc();
			_promiseList.push(_promise);

			_promise.then(function (statusCode) {
				saveItem.status = statusCode !== undefined ? statusCode : 2;
			}, function () {
				saveItem.status = 3;
			});
		});

		$q.all(_promiseList).finally(function () {
			$scope.saveMSG = "Finished!";
			$scope.saveLock = false;
			$scope.$broadcast("AppSaved", "");

			setTimeout(function() {
				$("#saveMDL").modal('hide');
				setTimeout(function() {
					$.notify({
						type: "success",
						title: Locale('Done'),
						content: Locale('saveSuccess'),
						region: "system"
					});
				}, 500);
			}, 100);
		});
	};

	// ================================================================
	// =                              UI                              =
	// ================================================================
	// 弹出保存对话框
	$scope.showSaveMDL = function () {
		$("#saveMDL").modal();

		$scope.saveMSG = "";
		$.each($scope.saveFileList, function (i, saveItem) {
			saveItem.status = 0;
		});
	};

	$(document).keydown(function (e) {
		if(e.which === 13 && $("#saveMDL").is(':visible')) {
			$("#saveAllConfirm").click();
		}
	});

	// Color picker
	$scope.colorList = [
		'#777777', '#337ab7', '#5cb85c', '#5bc0de', '#f0ad4e', '#d9534f'
	];

	// Show color picker dialog
	var _colorTarget;
	$(document).on("click", ".color-picker", function () {
		_colorTarget = $(this).closest("td").find("input, textarea");
		//在保存的时候（confirmColoredText），会将引号替换成转移字符，将<h1></h1>由转义字符替换为原始等操作，这里要进行逆操作
		var txt = _colorTarget.val();
		var _html = txt
			.replace(/\\"/g, '"')
			.replace(/\\n<h1>/g,'<br>&lt;h1&gt;')
			.replace(/<h1>/g,'&lt;h1&gt;') 
			.replace(/<\/h1>/g,'&lt;/h1&gt;<br>') 
			;
		$("#colorDisplayLayout").html(_html);
		$("#colorPickerMDL").modal();
	});

	// Color picker
	$("#colorPickerInput").colorpicker();
	$("#colorPickerInput").keydown(function (e) {
		if (e.which === 13) {
			var _val = ($(this).val() + "").trim();
			if (_val.match(/^\#[abcdefABCDEF\d]{6}$/)) {
				$scope.selectColorPickerColor(_val);
				$("#colorPickerInput").colorpicker('hide');
			}
		}
	});

	var _selection = null;
	$("#colorDisplayLayout").mouseup(function () {
		var _winSelect = window.getSelection();
		if (!_winSelect || $(_winSelect.anchorNode).closest("#colorDisplayLayout").length === 0) return;

		var _range = _winSelect.getRangeAt(0);

		_selection = {
			start: _range.startOffset,
			end: _range.endOffset,
			firstNode: _range.startContainer,
			lastNode: _range.endContainer,
		};
	});

	// Save color picker text
	$scope.confirmColoredText = function () {
		$("#colorPickerMDL").modal('hide');
		var _html = $("#colorDisplayLayout").html()
		//为了在国际化文件中正常显示，将引号替换成转移字符，将<h1></h1>由转义字符替换为原始的样式
		//每一次enter换行，这个picker控件都会产生一个<div><br><\/div>以表示新行（一旦录入内容，将会替换掉其中的<br>）
		//但是因为新版本的dota以<br>表示换行，以\n换段（一个h1一段），所以将这个整体替换为<br>
		var _text = _html
			.replace(/"/g, '\\"')
			.replace(/<div><br><\/div>/g, '<br>')//先替换空行，再替换有内容的行
			.replace(/<div>/g, '<br>')
			.replace(/<\/div>/g, '')
			.replace(/&lt;h1&gt;/g, '<h1>') 
			.replace(/&lt;\/h1&gt;/g, '</h1>') 
			.replace(/<br><h1>/g,'\\n<h1>')//h1换行后，由于编辑器是用的<br>换行，但是到dota里面，如果是<br><h1>会导致这个<h1>对应的段落显示异常，所以这里处理一下
			.replace(/<\/h1>[ ]*<br>/g,'</h1>')
			;
		_colorTarget.val(_text);
		_colorTarget.trigger("input");
	};

	$scope.selectColorPickerColor = function (color) {
		if (!_selection) return;

		function _getRootNode(node) {
			if (node.parentNode.nodeName === "FONT") {
				return node.parentNode;
			} else {
				return node;
			}
		}

		function _getText(node) {
			if (node.nodeName === "FONT") {
				return node.innerText;
			} else {
				return node.textContent;
			}
		}

		var _content = {
			first: null,
			text: "",
			last: null
		};

		var _start = _selection.start;
		var _end = _selection.end;
		var _firstNode = _getRootNode(_selection.firstNode);
		var _lastNode = _getRootNode(_selection.lastNode);
		var _nodeList = [];

		if (_firstNode === _lastNode) {
			// Only one selection
			_content.first = [_getText(_firstNode).slice(0, _start), _firstNode];
			_content.text = _getText(_firstNode).slice(_start, _end);
			_content.last = [_getText(_firstNode).slice(_end), _firstNode];

			_nodeList.push(_firstNode);
		} else {
			for (var _currentNode = _getRootNode(_firstNode); true; _currentNode = _getRootNode(_currentNode).nextSibling) {
				// First part
				if (_currentNode === _firstNode) {
					_content.first = [_getText(_currentNode).slice(0, _start), _currentNode];
					_content.text = _getText(_currentNode).slice(_start);
				} else if (_currentNode === _lastNode) {
					_content.last = [_getText(_currentNode).slice(_end), _currentNode];
					_content.text += _getText(_currentNode).slice(0, _end);
				} else {
					_content.text += _getText(_currentNode);
				}

				_nodeList.push(_currentNode);
				if (_currentNode === _lastNode) break;
			}
		}

		// Process
		function genNode(text, nodeName, preNode) {
			if (!text) return null;

			var _node;
			if (nodeName === "FONT") {
				_node = document.createElement("font");
				_node.innerText = text;

				if (preNode && preNode.nodeName === "FONT") {
					_node.color = preNode.color;
				}
			} else {
				_node = document.createTextNode(text);
			}
			return _node;
		}

		var _genFirst = genNode(_content.first[0], _getRootNode(_content.first[1]).nodeName, _getRootNode(_content.first[1]));
		var _genMiddle = genNode(_content.text, "FONT");
		var _genLast = genNode(_content.last[0], _getRootNode(_content.last[1]).nodeName, _getRootNode(_content.last[1]));
		_genMiddle.color = color;

		// Update
		var _markPlace = $(_firstNode);
		if (_genFirst) _markPlace.before(_genFirst);
		if (_genMiddle) _markPlace.before(_genMiddle);
		if (_genLast) _markPlace.before(_genLast);

		// Clean
		$.each(_nodeList, function (i, node) {
			_getRootNode(node).remove();
		});

		_selection = null;
	};

	$scope.clearColorPickerStyle = function () {
		$("#colorDisplayLayout").text($("#colorDisplayLayout").text());
	};

	// 隐藏菜单栏
	$(document).on("click.hideMenu", function (e) {
		setTimeout(function () {
			if (globalContent.system.hideMenu) {
				$(".app-menu.app-float-menu").hide();
			}
			globalContent.system.hideMenu = true;
		}, 1);
	});
	//禁用dom默认的右键事件，否则会导致自定义的右键菜单失效，比如技能列表不能复制技能，添加特效不能添加控制点等
	$(document).on("contextmenu", function (e) {
		e.preventDefault();
		return false;
	});

	// 阻止隐藏菜单
	$(document).on("click.preventHideMenu", ".app-submenu > a", function (e) {
		globalContent.system.hideMenu = false;
	});

	var _refreshMenuID;

	function _refreshMenu(ele) {
		ele = $(ele);

		var _offset = common.ui.offsetWin(ele);
		var _eleHeight = ele.outerHeight();
		var _winHeight = $(window).height();

		if (_offset.top + _eleHeight > _winHeight) {
			common.ui.offsetWin(ele, {
				top: _winHeight - _eleHeight,
				left: _offset.left
			});
		}

		// Sub Menu
		var _subMenu = ele.find(".app-menu:visible:first");
		if (_subMenu.length) _refreshMenu(_subMenu);
	}

	window.refreshMenu = function (ele) {
		ele = $(ele);
		clearInterval(_refreshMenuID);

		_refreshMenuID = setInterval(function () {
			if (ele.is(":visible")) {
				_refreshMenu(ele);
			} else {
				ele.find(".app-menu").css("top", 0);
				clearInterval(_refreshMenuID);
			}
		}, 100);
	};

	// 对话框确认
	$(document).on("keydown.dialog", ".modal-dialog input[type='text']", function (e) {
		if (e.which === 13) {
			$(this).closest(".modal-content").find(".modal-footer .btn-primary").click();
		}
	});

	// 关闭确认
	var _closeDlg = false;
	try {
		var gui = require('nw.gui');
		var win = gui.Window.get();
		win.on('close', function () {
			if(_closeDlg) this.close(true);

			var _my = this;
			_closeDlg = true;
			$.dialog({
				title: Locale('Exit'),
				content: Locale('exitConfirm'),
				confirm: true,
			}, function (ret) {
				_closeDlg = false;
				if (!ret) return;
				_my.close(true);
			});
		});
	} catch (err) {
	}

	// ================================================================
	// =                        Developer Tool                        =
	// ================================================================
	try {
		var gui = require('nw.gui');
		var win = gui.Window.get();
		$scope.devReload = function() {
			//win.reloadDev();新版本不支持了
			win.reload();
		};
		$scope.devShowConsole = function() {
			win.showDevTools();
		};
	} catch (err) {
	}

	// ================================================================
	// =                            初始化                            =
	// ================================================================
	AppVersionSrv.check();
	Unit.init();
	//AppImageSrv.load();
});