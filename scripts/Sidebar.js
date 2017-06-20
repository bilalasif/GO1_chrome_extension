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
			this.Vue.component('go-chat-box',{
				template: '#go-chat-box',
				props:[
					'feed'
				]
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
						self.document.getElementById("highestRated").getElementsByTagName("p")[0].style['color'] = '#31b7d9';
						self.document.getElementById("mostRecent").style['border-bottom'] = '10px solid #fcfcfd';
						self.document.getElementById("mostRecent").getElementsByTagName("p")[0].style['color'] = '#727272';
						this.$dispatch('updateHighestRated');
					},
					loadMostRecent: function(){
						self.document.getElementById("mostRecent").style['border-bottom'] = '10px solid #31b7d9';
						self.document.getElementById("mostRecent").getElementsByTagName("p")[0].style['color'] = '#31b7d9';
						self.document.getElementById("highestRated").style['border-bottom'] = '10px solid #fcfcfd';
						self.document.getElementById("highestRated").getElementsByTagName("p")[0].style['color'] = '#727272';
						this.$dispatch('updateMostRecent');
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
			return new this.Vue({
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
					updateHighestRated: function(){
						//update from api
						this.feed.screens.chat.chatList .push({
								topicName: "Animation Course Idea",
								topicId : '2b',
								added: '2 days ago',
								latestComment: {
									profilePic : "/Resources/images/blank-profile-picture.png",
									profileName: "Peter Parker",
									comment: "Yeah I think its a great idea and we should gt right on it."
								}
							},
							{
								topicName: "This could be topic for new LI",
								topicId : '2d',
								added: '2 days ago',
								latestComment: {
									profilePic : "/Resources/images/blank-profile-picture.png",
									profileName: "Samantha Berry",
									comment: "Why do you think so?"
								}
							});
					},
					updateMostRecent: function(){
						//update from api
						this.feed.screens.chat.chatList = [
							{
								topicName: "This could be topic for new LI",
								topicId : '2d',
								added: '2 days ago',
								latestComment: {
									profilePic : "/Resources/images/blank-profile-picture.png",
									profileName: "Samantha Berry",
									comment: "Why do you think so?"
								}
							},
							{
							topicName: "Animation Course Idea",
							topicId : '2b',
							added: '2 days ago',
							latestComment: {
								profilePic : "/Resources/images/blank-profile-picture.png",
								profileName: "Peter Parker",
								comment: "Yeah I think its a great idea and we should gt right on it."
							}
						}];
					},
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
		}
	}
}
if(!window.GO){
	window.GO = {};
}
if (!window.GO.goSideBar){
	window.GO.goSideBar = new Sidebar(window, document, chrome, Vue);
}