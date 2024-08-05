'use strict';

components.directive('tipfield', function($compile) {
	return {
		restrict: 'AE',
		scope: {
			alternative: "=?alternative",
			pagesize: "=?pagesize",
			matchfuc: "=?matchfuc",
		},
		controller: function($scope, $element, $attrs, Locale) {
			// TODO: if($scope.alternative || $scope.matchfuc) console.log(">>>", $scope, $scope.alternative, $scope.matchfuc);

			$scope.Locale = Locale;
			$scope.currentList = [];
			$scope.selected = -1;
			$scope.pagesize = $scope.pagesize || 10;

			$scope.selectItem = function(item) {
				$element.val(item.value);
				$element.trigger('input', item);
				$element.trigger('selected', item);
				$scope.currentList = [];
			};

			// Input update
			var _timerID = null;
			function _updateList() {
				if(_timerID !== null) return;

				_timerID = setTimeout(function() {
					$scope.selected = -1;
					var _val = ($element.val() || "");
					var origin_var = _val
					if(!_val) {
						$scope.currentList = [];
					} else {
						if($scope.matchfuc) {
							$scope.currentList = $scope.matchfuc(_val);
						} else if($scope.alternative) {
							_val = _val.toUpperCase();
							$scope.currentList = $.map($scope.alternative, function (item) {
								var _itemKey = (item.value || "") + (item.key || "") + (item._key || "") + Locale(item.value);
								if (_itemKey.toUpperCase().indexOf(_val) !== -1) {
									return item;
								}
							});
						}
					}
					//非搜索框，结果只有一个，并且一模一样就不显示列表了
					if($element.attr("id") != "search"){
						if($scope.currentList.length == 1 && $scope.currentList[0].value == origin_var){
							$scope.currentList = [];
						}
					}
					
					$scope.currentList = $scope.currentList.slice(0, $scope.pagesize);

					$scope.$apply();
					_timerID = null;
				}, 500);
			}

			// =======================================================
			// =                        Event                        =
			// =======================================================
			// Key press to show type ahead
			$element.on("keyup", function(e) {
				/* //复制粘贴不弹出列表了
				if(e.ctrlKey && (e.keyCode == 67 || e.keyCode == 86)){
					$scope.$apply();
					return;
				} */
				
				
				//65-90:a-zA-Z	48-57:0-9	8:backspace	  46:delete   32:space
				if((65 <= e.which && e.which <= 90) || (48 <= e.which && e.which <= 57) || e.which === 8 || e.which === 46 || e.which === 32) {
					_updateList();
				} else if(e.which === 38) {//38:向上
					$scope.selected -= 1;
					if($scope.selected < 0) $scope.selected = $scope.currentList.length - 1;
					$scope.$apply();
				} else if(e.which === 40) {//40：向下
					$scope.selected += 1;
					if($scope.selected >= $scope.currentList.length) $scope.selected =  0;
					$scope.$apply();
				} else if(e.which === 13) {//13：enter
					$scope.selectItem($scope.currentList[$scope.selected]);
					$scope.$apply();
				}
				//console.log(e.which);
			});

			// Blur to hide type ahead
			$element.on("blur", function(e) {
				setTimeout(function() {
					$scope.currentList = [];
					$scope.$apply();
				}, 100);
			});

			$scope.$on("$destroy",function() {
				$element.off("keyup");
				$element.off("blur");
				$scope._alternativeCntr.remove();
			});
		},
		compile: function ($element, $attrs) {
			return {
				pre: function ($scope, $element, $attrs) {
					$scope._alternativeCntr = $(
						'<ul class="app-menu" ng-show="currentList.length">'+
							'<li ng-repeat="item in currentList track by $index" ng-mousedown="selectItem(item)" ng-class="{selected: $index === selected}">' +
								'<a ng-class="{primary: item.suggest}">' +
									'{{item.value}} ' +
									'<span ng-if="item.key || item._key || Locale.hasKey(item.value)">[{{item.key ? Locale(item.key) : item._key || Locale(item.value)}}]</span>' +
								'</a>' +
							'</li>'+
						'</ul>'
					);
					$scope._alternativeCntr.css({
						position: "absolute"
					});

					// Add list
					$element.after($scope._alternativeCntr);
					$compile($scope._alternativeCntr)($scope);
				}
			};
		},
		replace: false
	};
});