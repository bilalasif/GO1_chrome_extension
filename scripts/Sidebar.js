if(typeof Sidebar !== 'function'){
	function Sidebar(window, document, chrome, Vue) {
		this.window = window;
		this.document = document;
		this.chrome = chrome;
		this.Vue = Vue;
		this._initMessageListener();
		this._initSidebar();
	}
	Sidebar.prototype =  {
		_sidebarHTML: 'html/templates.html',
		_initMessageListener: function(){
			var self = this;
			this.chrome.runtime.onMessage.addListener(function (message, sender, response) {
				if (!self[message.method]) {
					throw new Error('Method "' + message.method + '" does not exist');
				}
				var tab = sender;
				message.args = message.args || [];
				message.args.push(tab);
				message.args.push(response);
				self[message.method].apply(self, message.args || []);
				return true;
			});
		},
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
		addPublicNote: function(){
			this._sidebarApp.discussion
		},

		addPrivateNote: function(){
			var self = this;
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
						this.$dispatch('changeFeed', el.currentTarget.id);
					}
				}
			});
			this.Vue.component('go-chat-box',{
				template: '#go-chat-box',
				props:[
					'feed'
				]
			});

			this.Vue.component('go-discussion',{
				template: '#go-discussion',
				props:[
					'discussion'
				]
			});

			this.Vue.component('go-start-discussion',{
				template: '#go-start-discussion',
				props:[
					'discussion'
				],
				methods:{
					backToFeed: function(){
						var vueInstance = this;
						if(vueInstance.discussion.start.note.active) {
							//self.chrome.tabs.query({
							//	active: true,
							//	currentWindow: true
							//}, function (tab){
							//	self.chrome.tabs.sendMessage(tab[0].id, {'method': 'clearPreviousSelection'});
							//});
							self.chrome.storage.sync.set({'lastSelectedText': ''}, function () {
								vueInstance.discussion.start.note.active = false;
								vueInstance.discussion.start.note.text = '';
								vueInstance.discussion.start.style.topic = vueInstance.discussion.start.webLink.active ? {height : '40%', top : '38%'} : {height : '60%', top : '18%'};
								vueInstance.discussion.start.style.weblink =  {height : '20%', top : '18%'};
								vueInstance.$dispatch('openFeed');
							});
						}
						else{
							vueInstance.$dispatch('openFeed');
						}
					},
					addDiscussion: function(){
						var vueInstance = this;
						var heading = self.document.getElementById('topic');
						var detail = self.document.getElementById('topicDescription');
						if(vueInstance.discussion.start.topic.heading.length <= 0){
							heading.className = 'error';
						}
						else if(vueInstance.discussion.start.topic.detail.length <= 0){
							detail.className = 'error';
							heading.className = '';
						}
						else{
							self.chrome.storage.sync.set({'lastSelectedText': ''}, function () {
								vueInstance.$dispatch('uploadDiscussion');
								detail.className = '';
								heading.className = '';
							});
						}
					},
					openDiscussionSettings: function(){
						alert('settings');
					},
					addRemoveWebLink: function(el){
						this.$dispatch('getMeta', el.currentTarget.checked);
					}
				}
			});

			this.Vue.component('go-continue-discussion',{
				template: '#go-continue-discussion',
				props:[
					'discussion'
				],
				methods:{
					openDiscussionSettings: function(){
						alert('settings');
					}
				}
			});

			this.Vue.component('go-footer',{
				template: '#go-footer',
				methods:{
					addToDiscussion: function(el){
						this.$dispatch('startDiscussion');
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
				methods:{
					submitLogin: function(){
						this.$dispatch('formSubmit');
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
					form: {
						active: true,
						emailId: null,
						pwd: null,
						formError: {
							active: false,
							text:''
						}
					},
					feed: {
						active: false,
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
					},
					discussion:{
						active: false,
						start:{
							active: true,
							note:{
								active: false,
								text: ''
							},
							webLink:{
								active:false,
								imgSrc:null,
								url: null,
								title: null,
								desc: null
							},
							topic:{
								heading: '',
								detail: ''
							},
							style:{
								topic: '',
								weblink: ''
							}
						},
						continue:{
							active: false
						}
					}
				},
				methods:{
					loadInitialScreen: function(){
						var vueInstance = this;
						self.chrome.storage.sync.get(null, function(resp){
							if(resp.loggedIn){
								if(resp.lastSelectedText && resp.lastSelectedText.length > 0){
									vueInstance.startDiscussionScreen();
									vueInstance.discussion.start.note.active = true;
									vueInstance.discussion.start.note.text = resp.lastSelectedText;
									vueInstance.discussion.start.style.topic = {height : '50%', top : '28%'};
									self.chrome.tabs.query({
										active: true,
										currentWindow: true
									}, function (tab){
										self.chrome.tabs.sendMessage(tab[0].id, {'method': 'highlightSelection'});
									});
								}
								else{
									vueInstance.openFeedScreen();
								}
							}
						});
					},
					adjustPopupDimension: function(){
						self.document.getElementsByTagName("html")[0].style.height="600px";
						if(this.form.active) {
							self.document.getElementsByTagName("html")[0].style.width = "300px";
						}
						else {
							self.document.getElementsByTagName("html")[0].style.width = "450px";
						}
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
					},
					openFeedScreen : function(){
						this.discussion.active= false;
						this.form.active= false;
						this.feed.active= true;
						this.changeFeedScreen('chat');
						this.adjustPopupDimension();
					},
					startDiscussionScreen : function(){
						this.feed.active = false;
						this.discussion.active = this.discussion.start.active = true;
						this.discussion.start.webLink.active = false;
						this.form.active= false;
						this.adjustPopupDimension();
					}
				},
				events:{
					uploadDiscussion: function(){
						this.openFeedScreen();		//upload data to api
						console.log("Heading: "+(this.discussion.start.topic.heading || 'Empty'));
						console.log("Detail: "+(this.discussion.start.topic.detail || 'Empty'));
						console.log("Link: "+(this.discussion.start.webLink.url || 'Empty'));
						console.log("Note: "+(this.discussion.start.note.text || 'Empty'));
						alert('note added');
					},
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
					changeFeed: function(screenId){
						this.changeFeedScreen(screenId);
					},
					formSubmit: function(){
						var vueInstance = this;
						this.form.formError.active = !this.form.emailId || this.form.emailId.indexOf('@') === -1 || !this.form.pwd;
						if(!this.form.emailId && !this.form.pwd){
							this.form.formError.text = "Please enter email and password"
						}
						else if(!this.form.emailId || this.form.emailId.indexOf('@') === -1){
							this.form.formError.text = "Please enter valid email address"
						}
						else if(!this.form.pwd){
							this.form.formError.text = "Please enter password"
						}
						else{
							//send to api
							//form submitted
							//incase of success
							self.chrome.storage.sync.set({"loggedIn": true});
							self.chrome.tabs.query({}, function(tabs){
								for(var i =0; i<tabs.length; i++){
									self.chrome.tabs.sendMessage(tabs[i].id, {"method":"initHighlighter"});
								}
								vueInstance.openFeedScreen();
							});
						}
					},
					startDiscussion: function(){
						this.startDiscussionScreen();
					},
					openFeed: function(){
						this.openFeedScreen();
					},
					getMeta: function(check){
						var vueInstance = this;
						if(check){
							self.chrome.tabs.query({
								active: true,
								currentWindow: true
							}, function (tab){
								self.chrome.tabs.sendMessage(tab[0].id, {'method': 'getMetaContent'}, function(resp){
									console.log(resp);
									vueInstance.discussion.start.webLink.url = resp.url;
									vueInstance.discussion.start.webLink.imgSrc = resp.imgSrc;
									vueInstance.discussion.start.webLink.desc = resp.desc;
									vueInstance.discussion.start.webLink.title = resp.title;
									vueInstance.discussion.start.webLink.active = true;
									vueInstance.discussion.start.style.topic = vueInstance.discussion.start.note.active ? {height : '28%', top : '50%'} : {height : '40%', top : '38%'};
									vueInstance.discussion.start.style.weblink = vueInstance.discussion.start.note.active ? {height : '20%', top : '28%'} : {height : '20%', top : '18%'};
								});
							});
						}
						else{
							vueInstance.discussion.start.webLink.active = false;
							vueInstance.discussion.start.style.topic = vueInstance.discussion.start.note.active ? {height : '50%', top : '28%'} : {height : '60%', top : '18%'};
						}
					}
				},
				ready: function(){
					this.adjustPopupDimension();
					this.loadInitialScreen();
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