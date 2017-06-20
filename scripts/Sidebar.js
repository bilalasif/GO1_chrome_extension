if(typeof Sidebar !== 'function'){
	function Sidebar(window, document, chrome, Vue) {
		this.window = window;
		this.document = document;
		this.chrome = chrome;
		this.Vue = Vue;
		this._initSidebar();
	}
	Sidebar.prototype =  {
		_sidebarHTML: 'html/templates.html',
		_initSidebar: function(){
			var self = this;
			var sidebarContainer = this.document.createElement('div'),
					sidebarMount = this.document.createElement('div');
			sidebarContainer.appendChild(sidebarMount);
			this.document.body.appendChild(sidebarContainer);
			function onload(data) {
				var resp = data.target;
				if (resp.status !== 200) {
					return;
				}
				var templates = self.document.createElement('div');
				templates.innerHTML = resp.responseText;
				sidebarContainer.appendChild(templates);
				self._sidebarApp = self._initVue(sidebarMount);

			}
			var request = new XMLHttpRequest();
			request.open('GET', self.chrome.runtime.getURL(this._sidebarHTML), true);
			request.onload = onload;
			request.send();
		},
		_initVue: function(sidebarEl){
			var self = this;
			this.Vue.component('go-header',{
				template: '#go-header',
				props:[
					'feed'
				],
				methods:{
					changeScreen: function(el){
						this.$dispatch('changeFeedScreen', el.currentTarget.id);
					}
				}
			});

			this.Vue.component('go-footer',{
				template: '#go-footer',
				methods:{
					addToDiscussion: function(el){
						alert('added to discussion');
					},
					addToPortal: function(el){
						alert('added to portal');
					}
				}
			});
			this.Vue.component('go-chat', {
				template: '#go-chat',
				props: [
					'feed'
				],
				methods:{
					bringToFocus: function(){
						self.document.getElementById("highestRated").click();
					},
					loadHighestRated: function() {
						self.document.getElementById("highestRated").style['border-bottom'] = '10px solid #31b7d9';
						self.document.getElementById("mostRecent").style['border-bottom'] = '10px solid #fcfcfd';
					},
					loadMostRecent: function(){
						self.document.getElementById("mostRecent").style['border-bottom'] = '10px solid #31b7d9';
						self.document.getElementById("highestRated").style['border-bottom'] = '10px solid #fcfcfd';
					}
				},
				ready: function(){
					this.bringToFocus();
				}

			});
			this.Vue.component('go-settings', {
				template: '#go-settings',
				methods:{
					updateClickedSetting: function(el){
						alert(el.currentTarget.checked?'On':'Off');
					},
					signOut: function(){
						alert('Signing Out');
					}
				}
			});
			this.Vue.component('go-feed', {
				template: '#go-feed',
				props: [
					'feed'
				]
			});
			this.Vue.component('log-in-form', {
				template: '#go-login-form',
				props: [
					'form'
				],
				data: function () {
					return {
						emailId: null,
						pwd: null
					}
				},
				methods:{
					submitLogin: function(){
						alert("Log in Clicked");
					},
					gotoRegister: function(){
						alert("Register Clicked");
					},
					forgotPassword: function(){
						alert("Password Forgotten Clicked");
					}
				}
			});
			var app = new this.Vue({
				el: sidebarEl,
				template: '#go-root',
				data: {
					form: false,
					feed: {
						active: true,
						screens:{
							chat: {
								active: true,
								empty: false,
								chatList: []
							},
							notif: {
								active: false
							},
							settings: {
								active: false
							}
						}
					}
				},
				methods:{
					adjustPopupDimension: function(){
						self.document.getElementsByTagName("html")[0].style.height="600px";
						if(this.form) {
							self.document.getElementsByTagName("html")[0].style.width = "300px";
						}
						else if(this.feed.active){
							self.document.getElementsByTagName("html")[0].style.width = "450px";
						}
					}
				},
				events:{
					changeFeedScreen: function(screenId){
						var vueInstance = this;
						if(vueInstance.feed){
							for(var screen in vueInstance.feed.screens){
								if(vueInstance.feed.screens.hasOwnProperty(screen)) {
									vueInstance.feed.screens[screen].active = screen === screenId;
								}
							}
						}
					}
				},
				ready: function(){
					this.adjustPopupDimension();
				}
			});
			return app;
		}
	}
}
if(!window.GO){
	window.GO = {};
}
if (!window.GO.goSideBar){
	window.GO.goSideBar = new Sidebar(window, document, chrome, Vue);
}