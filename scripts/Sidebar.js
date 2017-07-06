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
				],
				methods:{
					loadDiscussion: function(event){
						this.$dispatch('viewDiscussion', event.currentTarget.getAttribute('topic-id'));
					}
				}
			});

			this.Vue.component('go-discussion',{
				template: '#go-discussion',
				props:[
					'discussion',
					'user'
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
								vueInstance.discussion.start.style.topic = vueInstance.discussion.start.webLink.active ? {height : '40%'} : {height : '60%'};
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
					'discussion',
					'user'
				],
				data: function(){
					return {
						textEl: null,
						toggleState: 0,
						toggleImg: "/Resources/images/down_arrow.png",
						commentReplyActive: null
					}
				},
				methods:{
					replyToComment: function(){
						this.commentReplyActive = event.currentTarget.getAttribute('comment-id');
					},
					checkTextLength: function(){
						var vueInstance = this;
						setTimeout(function(){
							vueInstance.textEl = self.document.getElementById('discussionDiv').children[0];
							vueInstance.discussion.continue.topic.detail.showFull = (vueInstance.textEl.offsetHeight < vueInstance.textEl.scrollHeight || vueInstance.textEl.offsetWidth < vueInstance.textEl.scrollWidth);
						}, 300);

					},
					toggleText: function(){
						if(this.toggleState == 0) {
							this.discussion.continue.style.detailText = {height: this.textEl.scrollHeight + 'px'};
							this.toggleImg = "/Resources/images/up_arrow.png";
							this.toggleState = 1;
						}
						else if(this.toggleState == 1){
							this.discussion.continue.style.detailText = {height: '56px'};
							this.toggleImg = "/Resources/images/down_arrow.png";
							this.toggleState = 0;
						}
					},
					addComment: function() {
						if(this.discussion.continue.inputComment.mainComment.length >0){
							this.$dispatch('uploadComment', event.currentTarget.getAttribute('topic-id'));
						}
					},
					addReply: function(){
						if(this.discussion.continue.inputComment.reply.length >0){
							this.$dispatch('uploadReply', event.currentTarget.getAttribute('comment-id'), event.currentTarget.getAttribute('topic-id'));
						}
					},
					backToFeed: function(){
						this.$dispatch('openFeed');
					},
					openDiscussionSettings: function(){
						alert('settings');
					}
				},
				ready: function(){
					this.checkTextLength();
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
					if(this.feed.screens.chat.chatList.length === 0){
						this.feed.screens.chat.empty = true;
					}
					else{
						this.bringToFocus();
					}
				}

			});
			this.Vue.component('go-settings', {
				template: '#go-settings',
				props:[
					'user'
				],
				methods:{
					updateClickedSetting: function(el){
						//upload seetting to api
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
					'user',
					'feed'
				]
			});
			this.Vue.component('go-log-in-form', {
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
					user:{
						id: '',
						name:'GO1 User',
						profilePicSrc: '/Resources/images/blank-profile-picture.png'
					},
					form: {
						active: false,
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
						active: true,
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
								topic: ''
							}
						},
						continue:{
							active: true,
							topic:{
								id:'test',
								heading:'Testing',
								detail:{
									text: 'Before you can begin to determine what the composition of a particular paragraph will be, you must first decide on an argument and a working thesis statement for your paper. What is the most important idea that you are trying to convey to your reader? The information in each paragraph must be related to that idea. In other words, your paragraphs should remind your reader that there is a recurrent relationship between your thesis and the information in each paragraph. A working thesis functions like a seed from which your paper, and your ideas, will grow. The whole process is an organic one—a natural progression from a seed to a full-blown paper where there are direct, familial relationships between all of the ideas in the paper.									The decision about what to put into your paragraphs begins with the germination of a seed of ideas; this “germination process” is better known as brainstorming. There are many techniques for brainstorming; whichever one you choose, this stage of paragraph development cannot be skipped. Building paragraphs can be like building a skyscraper: there must be a well-planned foundation that supports what you are building. Any cracks, inconsistencies, or other corruptions of the foundation can cause your whole paper to crumble.',
									showFull: false
								}
							},
							note:{
								active: false,
								text: ''
							},
							style:{
								detailText:''
							},
							added:'Right Now',
							inputComment:{
								mainComment:'',
								reply:''
							},
							comments: []
							//	{
							//		id: 'comm1',
							//		name: 'GO1 User2',
							//		text: 'Nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom',
							//		imgSrc: '/Resources/images/blank-profile-picture.png',
							//		replies: [
							//			{
							//				name: 'GO1 User3',
							//				text: 'Nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom',
							//				imgSrc: '/Resources/images/blank-profile-picture.png'
							//			},{
							//				name: 'GO1 User4',
							//				text: 'Nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom',
							//				imgSrc: '/Resources/images/blank-profile-picture.png'
							//			}
							//		]
							//	},{
							//		id: 'comm2',
							//		name: 'GO1 User5',
							//		text: 'Nom nom nom',
							//		imgSrc: '/Resources/images/blank-profile-picture.png',
							//		replies: [
							//			{
							//				name: 'GO1 User3',
							//				text: 'Nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom',
							//				imgSrc: '/Resources/images/blank-profile-picture.png'
							//			},{
							//				name: 'GO1 User4',
							//				text: 'Nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom nom',
							//				imgSrc: '/Resources/images/blank-profile-picture.png'
							//			}
							//		]
							//	}
							//]
						},
						tempDiscussion: []				//temporary to be removed after api integration
					}
				},
				methods:{
					viewDiscussionScreen: function(){
						this.feed.active = false;
						this.discussion.active = this.discussion.continue.active = true;
						this.discussion.start.webLink.active = false;
						this.discussion.start.active = false;
						this.form.active= false;
						this.adjustPopupDimension();
					},
					loadInitialScreen: function(){
						var vueInstance = this;
						self.chrome.storage.sync.get(null, function(resp){
							if(resp.loggedIn){
								if(resp.lastSelectedText && resp.lastSelectedText.length > 0){
									vueInstance.startDiscussionScreen();
									vueInstance.discussion.start.note.active = true;
									vueInstance.discussion.start.note.text = resp.lastSelectedText;
									vueInstance.discussion.start.style.topic = {height : '50%'};
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
							else{
								vueInstance.openLoginScreen();
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
					openLoginScreen : function(){
						this.discussion.active= false;
						this.form.active= true;
						this.feed.active= false;
						this.adjustPopupDimension();
					},
					startDiscussionScreen : function(){
						this.discussion.start =
						{
							active: true,
							note: {
								active: false,
								text: ''
							},
							webLink: {
								active: false,
								imgSrc: null,
								url: null,
								title: null,
								desc: null
							},
							topic: {
								heading: '',
								detail: ''
							},
							style: {
								topic: ''
							}
						};
						this.feed.active = false;
						this.discussion.active = true;

						this.discussion.start.webLink.active = false;
						this.discussion.continue.active = false;
						this.form.active= false;
						this.adjustPopupDimension();
					}
				},
				events:{
					uploadReply: function(commentID, topicId){
						var vueInstance = this;
						//upload reply to api
						//on success add reply to comment object donot change screen

						// on success
						var replyObj = {
							name: vueInstance.user.name,
							text: vueInstance.discussion.continue.inputComment.reply,
							imgSrc: vueInstance.user.profilePicSrc
						};
						vueInstance.discussion.tempDiscussion[topicId].comments.some(function(obj){
							if(obj.id == commentID){
								obj.replies.push(replyObj);
								return true;
							}
						});
						vueInstance.discussion.continue.inputComment.reply ='';
						vueInstance.discussion.continue.comments = vueInstance.discussion.tempDiscussion[topicId].comments;
					},
					uploadComment: function( topicId){
						var vueInstance = this;
						//upload Comment to api
						//on success add Comment to comment object donot change screen

						// on success
						vueInstance.discussion.tempDiscussion[topicId].comments =vueInstance.discussion.tempDiscussion[topicId].comments || [];
						var commentObj = {
							id:vueInstance.discussion.tempDiscussion[topicId].comments.length +'',
							name: vueInstance.user.name,
							text: vueInstance.discussion.continue.inputComment.mainComment,
							imgSrc: vueInstance.user.profilePicSrc,
							replies: []
						};
						vueInstance.discussion.tempDiscussion[topicId].comments.push(commentObj);
						vueInstance.discussion.continue.inputComment.mainComment ='';
						vueInstance.discussion.continue.comments = vueInstance.discussion.tempDiscussion[topicId].comments;
					},
					viewDiscussion: function(topicId){
						//get topic from server via ID
						//update the discussion.continue Object
						//right now local temp object is used
						//text.replace(/\r?\n/g, '<br />');
						this.discussion.continue.topic.id = topicId;
						this.discussion.continue.topic.heading = this.discussion.tempDiscussion[topicId].topic.heading;
						this.discussion.continue.topic.detail.text = this.discussion.tempDiscussion[topicId].topic.detail;
						this.discussion.continue.note.active = this.discussion.tempDiscussion[topicId].note.text.length > 0;
						this.discussion.continue.note.text = this.discussion.tempDiscussion[topicId].note.text;
						// update Comment object as well
						this.discussion.continue.comments = this.discussion.tempDiscussion[topicId].comments;
						this.viewDiscussionScreen();
					},
					uploadDiscussion: function(){
						//upload data to api
						console.log("Heading: "+(this.discussion.start.topic.heading || 'Empty'));
						console.log("Detail: "+(this.discussion.start.topic.detail || 'Empty'));
						console.log("Link: "+(this.discussion.start.webLink.url || 'Empty'));
						console.log("Note: "+(this.discussion.start.note.text || 'Empty'));
						this.discussion.tempDiscussion.push(this.discussion.start);
						//show loader
						// upload to api
						// update chatlist from response
						this.feed.screens.chat.empty = false;
						this.feed.screens.chat.chatList .push({
							topicName: this.discussion.start.topic.heading,
							topicId : this.discussion.tempDiscussion.indexOf(this.discussion.start),
							added: 'Right now',
							latestComment: {
								profilePic : "/Resources/images/blank-profile-picture.png",
								profileName: "GO 1 User",
								comment: this.discussion.start.topic.detail
							}
						});
							this.openFeedScreen();
					},
					updateHighestRated: function(){
						//update from api

					},
					updateMostRecent: function(){
						//update from api

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
							vueInstance.user.name = 'GO1 User'; //update from api response
							vueInstance.user.profilePicSrc = '/Resources/images/blank-profile-picture.png';
							self.chrome.storage.sync.set({
								"loggedIn": true,
								"userName": vueInstance.user.name,
								"imgSrc": vueInstance.user.profilePicSrc
							});
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
									vueInstance.discussion.start.style.topic = vueInstance.discussion.start.note.active ? {height : '28%'} : {height : '40%'};
								});
							});
						}
						else{
							vueInstance.discussion.start.webLink.active = false;
							vueInstance.discussion.start.style.topic = vueInstance.discussion.start.note.active ? {height : '50%'} : {height : '60%'};
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
if(!window.GO1){
	window.GO1 = {};
}
if (!window.GO1.goSideBar){
	window.GO1.goSideBar = new Sidebar(window, document, chrome, Vue);
}