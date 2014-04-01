var trace = function(m){ console.log(m)}
require.config({
	paths: {
		jquery: "/jquery/jquery",
		angular: "/angular/angular",
		angularRoute: "/angular-route/angular-route"
	},
	shim: {
		angularRoute: {
			deps: ['angular'],
		 	attach: 'angularRoute'
		}
	}
});

/*
  T.B.D 
	-> split angular modules in separate files
*/
require(['jquery', 'angularRoute'],function(jq, ar, ds){
	angular.module('quill', ['ngRoute'])
		.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
			$locationProvider.html5Mode(true);
			$routeProvider
				.when('/channel_:id',{
					controller: 'LoadItemsCtrl',
					template: "items",
					reloadOnSearch: true
				})
				.when('/channel_:id/item_:uid',{
					controller: 'LoadDetailsCtrl',
					template: "details"
				});
		}])

		.service('QuillAPI',function($q){
			var API_LINK = "http://api.quill-company.com/api/v1/",
				API_LINK_EXTRAS = "api_key=%a&site_key=%s&page=%p&per_page=%pg&callback=?",
				link = "";
			return{
				loadInProgress: false,
				error: null,
				get: function(endpoint, id, api, page, itemsPerPage){
					var def = $q.defer(), that = this;
					this.loadInProgress = true;

					itemsPerPage = itemsPerPage || 20;
					page = page || 1;
					link = API_LINK+ endpoint + (id ? "/"+id : "")+".json?"+ API_LINK_EXTRAS
						.replace("%a", api.api_key)
						.replace("%s", api.site_key)
						.replace("%p", page)
						.replace("%pg", itemsPerPage)

					//trace("API CALL:: "+link);
					$.ajax({
						method: "GET",
						dataType: "json",
						url: link,
						timeout: 2000,
						success: function(data){
							//setTimeout(function(){def.resolve(data)},1000)
							def.resolve(data)
							that.loadInProgress = false;
						},
						error: function(){
							def.reject(arguments)
							
							that.error = { title: "AJAX ERROR", description: "What you requested failed to load... please try again!"}
							that.loadInProgress = false;
						}
					})
					return def.promise;
				}
			}
		})

		.service("Global", ['CookieAPI', 'QuillAPI', '$sce',function(_cookie, _api, $sce){
			return{
				saved_items: _cookie.getItems(),
				channels: [],
				items: [],

				cookie: _cookie,
				api: _api,
				
				items_per_page: [5,10,20,50,100],
				currentChannel: null,
				currentPageSize: 20,
				currentItem: null,
				currentPage: 1,
				details: null,
				pages: null,

				allowReload: true,
								
				validAPI: function(api){
					var isValid = false;
					if (api.hasOwnProperty('api_key') && api.api_key.length > 10 && api.hasOwnProperty('site_key') && api.site_key.length > 2){
						isValid = true;
					}
					return isValid
				},
				loadDetails: function(id, api){
					trace('LOAD DETAILS FOR ITEM_ID: '+id);
					var _g = this;
					_g.api.get("items", _g.currentItem, api).then(function(data){
						_g.details = data.item;
						_g.details.summary = $sce.trustAsHtml(_g.details.summary)
						_g.details.content = $sce.trustAsHtml(_g.details.content)

						window.scrollTo(1);
					})
				},
				loadChannels: function(api){
					var _g = this;
					
					_g.channels = []
					_g.items = []

					_g.api.error = null;
					_g.details = null;
					_g.currentChannel = null;
					_g.currentItem = null;

					trace('LOAD CHANNELS - ' +api.site_key);
					_g.api.get("channels", null, api).then(function(data){ 
						_g.channels = data.channels.channel
						_g = null;
					})
				},
				loadItems: function(id, api){
					var _g = this;
					
					if (!_g.allowReload){
						_g.allowReload = true;
						return;
					}

					trace('LOAD ITEMS FOR CHANNEL_ID: '+ id);
					_g.api.get("channels", id, api, _g.currentPage, _g.currentPageSize).then(function(data){ 
						if (parseInt(data.items.size)){
							_g.items = data.items.item;
							_g.pages = Math.round(data.items.size/_g.currentPageSize);
							_g.pages = _g.pages === 0 ? 1 : _g.pages
							$.each(_g.items, function(i,item){ if (item.summary){ item._summary = $sce.trustAsHtml(item.summary);}});
						}else{
							_g.items = []
						}
						_g = null;
					});
				}
			}
		}])

		.service("CookieAPI", function(){
			var data, available = false, ns = "quill", noKey = '$$hashKey';

			if (window.localStorage){
				available = true;
				data = JSON.parse(localStorage.getItem(ns));
				
				if (data === null){
					localStorage.setItem(ns,"");
					data = {}
					save();
				}
			}else{
				data = {}
			}

			function save(){
				if (available){
					localStorage.setItem(ns, JSON.stringify(data))
					return true;	
				}
				return false;
			}
			return{
				addItem: function(item){
					delete item[noKey]
					data[item.name] = item;
					return save();
				},
				removeItem: function(itemID){
					if (data[itemID]){
						delete data[itemID]
						return save()
					}
					return false;
				},
				getItems: function(){
					var items = []
					for (var ii in data){
						delete data[ii][noKey]
						items.push(data[ii])
					}
					return items;
				}
			}
		})

		.controller('LoadItemsCtrl', ['$scope', 'Global', '$routeParams', '$location', function($scope, _g, $routeParams, $location){
			_g.currentChannel = $routeParams.id
			
			if (_g.items.length === 0 || $location.search().per_page){ 
				_g.loadItems(_g.currentChannel, $scope.api)
			}
		}])

		.controller('LoadDetailsCtrl', ['$scope', 'Global', '$routeParams', '$location', function($scope, _g, $routeParams, $location){
			_g.currentChannel = $routeParams.id;
			_g.currentItem = $routeParams.uid;
			_g.details = {};

			if (_g.items.length === 0 || $location.search().per_page){
				_g.loadItems(_g.currentChannel, $scope.api)
			}
			_g.loadDetails(_g.currentItem, $scope.api);
		}])

		.controller('MainCtrl', ["$scope", 'Global', "$location", "$routeParams", function($scope, _g, $location, $routeParams){
			$scope.api = { api_key: "1vBbtLg7_-BM_FBYSEOP", site_key: "parishilton"}
			$scope._g = _g;
			window.__g = _g;
			const HIDE_API = "Hide API keys", SHOW_API = "Show API keys";

			$scope.filter_attribute = 'created_at';
			$scope.filter_reverse = true;
			$scope._visibleNav = true;
			$scope._navLabel = $scope._visibleNav ? HIDE_API : SHOW_API
			$scope._summaryLimit = 100;

			// data loading
			$scope.loadChannels = function(api, silent){
				if (_g.validAPI($scope.api)){
					if (!silent) { $location.path('/').search({});}
					_g.loadChannels($scope.api);
				}else{
					_g.api.error = { title: "WARNING", description: "The API & SITE key combination is not valid!"}
				}
			}
			$scope.loadItemsByDropdown = function(){
				_g.currentChannel = _g.channels[$('#alternateSelection').val()].id
				$scope.loadItems();
			}	
			$scope.loadItems = function(e){	
				if (e){ e.preventDefault();}
				
				_g.currentChannel = e ? e.target.dataset.id || $(e.target).parent()[0].dataset.id : _g.currentChannel;
				
				// prevent loading again if on current page
				if ($routeParams.id === _g.currentChannel) return;
				
				_g.items = [];
				_g.details = null;
				_g.currentPage = 1;

				$location.path('/channel_'+_g.currentChannel);
			}
			$scope.reloadItems = function(){ 
				trace("RELOAD ITEMS FOR SIZE: "+_g.currentPageSize)
				_g.currentPage = 1;
				$location.search({
					'page': _g.currentPage,
					'per_page': _g.currentPageSize
				});
			}
			$scope.loadDetails = function(e){
				if (e) { e.preventDefault()}
				_g.currentItem = e.target.dataset.id || _g.currentItem;

				$location.path('/channel_'+_g.currentChannel+"/item_"+_g.currentItem);
			}
			$scope.loadPage = function(){
				trace("RELOAD ITEMS FOR PAGE: "+_g.currentPage)			
				$location.search({
					'page': _g.currentPage,
					'per_page': _g.currentPageSize
				});
			}
			

			// api keys management
			$scope.saveApiCombination = function(e){
				e.preventDefault();
				if (_g.validAPI($scope.api)){
					var name = prompt("What name do you want to give your selection?\n(max 20 chars)")
					if (name && name.length>2){
						if (_g.cookie.addItem({ name: name.substr(0,20), api_key: $scope.api.api_key, site_key: $scope.api.site_key,})){
							// item was saved ... repopulate cookie items
							_g.saved_items = _g.cookie.getItems();
						}else{
							// item wasn't saved
						}
					}
					name = null;
				}else{
					_g.error = { title: "WARNING", description: "The API & SITE key combination is not valid!"}
				}
			}
			$scope.removeApiCombination = function(e){
				e.preventDefault();
				var id = $(e.target).parent()[0].dataset.name;
				if(_g.cookie.removeItem(id)){
					_g.saved_items = _g.cookie.getItems();
				}else{
					// it wasn't deleted
				}
				id = null;
			}
			$scope.loadApiCombination = function(e){
				e.preventDefault();
				try{
					var currentItem = _g.saved_items[e.target.dataset.index];
					$scope.api.api_key = currentItem.api_key;
					$scope.api.site_key = currentItem.site_key;

					_g.currentChannel = null;
					_g.currentItem = null;
					_g.details = null;
					_g.items = [];
					$location.path('/').search({});
					//setTimeout(function(){ $('#submitTrigger').trigger('click')	},100)
				}catch(e){
				}
			}

			// handle user interaction
			$scope.closeError = function(){ _g.api.error = null;}
			$scope.toggleNav = function(e){
				$scope._visibleNav = !$scope._visibleNav; 
				$scope._navLabel = $scope._visibleNav ? HIDE_API : SHOW_API
				e.preventDefault();
			}
			$scope.closeDetails = function(){ 
				_g.details = null;
				_g.allowReload = false;
				$location.path('/channel_'+_g.currentChannel);
			}
			
			// initial load and parse of location query params
			$scope.loadChannels($scope.api, true)
			var query = $location.search();
			if (query.page){ _g.currentPage = parseInt(query.page);}
			if (query.per_page){ _g.currentPageSize = parseInt(query.per_page);}

			query = null;
		}]);

	angular.bootstrap(document, ["quill"])
});