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
				self.vueInstance = self._initVue(sidebarMount);

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
						var vueInstance = this;
						vueInstance.$dispatch('changeFeed', el.currentTarget.id);
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
						var vueInstance = this;
						vueInstance.$dispatch('viewDiscussion', event.currentTarget.getAttribute('topic-id'));
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

			this.Vue.component('go-add-to-portal',{
				template: '#go-add-to-portal',
				props:[
					'portal'
				],
				methods:{
					backToFeed: function(){
						var vueInstance = this;
						vueInstance.$dispatch('openFeed');
					}
				}
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
							self.chrome.tabs.query({
								active: true,
								currentWindow: true
							}, function (tab){
								self.chrome.tabs.sendMessage(tab[0].id, {'method': 'clearPreviousSelection'});
							});
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
						var vueInstance = this;
						vueInstance.$dispatch('getMeta', el.currentTarget.checked);
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
						commentReplyActive: null,
						imgLike: '/Resources/images/like_inactive.png'
					}
				},
				methods:{
					makeIdObject: function(topicId, commentId, replyId){
						return JSON.stringify({"topicId":topicId || '', "commentId": commentId || '', "replyId":replyId || ''});
					},
					like: function(event){
						var vueInstance = this;
						var idObject = JSON.parse(event.currentTarget.getAttribute('data-id'));
						vueInstance.$dispatch('likeAction', idObject);
					},
					replyToComment: function(event){
						var vueInstance = this;
						vueInstance.discussion.continue.inputComment.reply = '';
						vueInstance.commentReplyActive = event.currentTarget.getAttribute('comment-id');
					},
					checkTextLength: function(){
						var vueInstance = this;						
						setTimeout(function(){
							if(vueInstance.discussion.active && vueInstance.discussion.continue.active){
								vueInstance.textEl = self.document.getElementById('discussionDiv').children[0];
								vueInstance.discussion.continue.topic.detail.showFull = (vueInstance.textEl.offsetHeight < vueInstance.textEl.scrollHeight || vueInstance.textEl.offsetWidth < vueInstance.textEl.scrollWidth);
							}
						}, 300);

					},
					toggleText: function(){
						var vueInstance = this;
						if(vueInstance.toggleState == 0) {
							vueInstance.discussion.continue.style.detailText = {height: vueInstance.textEl.scrollHeight + 'px'};
							vueInstance.toggleImg = "/Resources/images/up_arrow.png";
							vueInstance.toggleState = 1;
						}
						else if(vueInstance.toggleState == 1){
							vueInstance.discussion.continue.style.detailText = {height: '56px'};
							vueInstance.toggleImg = "/Resources/images/down_arrow.png";
							vueInstance.toggleState = 0;
						}
					},
					addComment: function(event) {
						var vueInstance = this;
						if(vueInstance.discussion.continue.inputComment.mainComment.length >0){
							vueInstance.$dispatch('uploadComment', event.currentTarget.getAttribute('topic-id'));
						}
					},
					addReply: function(event){
						var vueInstance = this;
						if(vueInstance.discussion.continue.inputComment.reply.length >0){
							vueInstance.$dispatch('uploadReply', event.currentTarget.getAttribute('comment-id'), event.currentTarget.getAttribute('topic-id'));
						}
					},
					backToFeed: function(){
						var vueInstance = this;
						vueInstance.$dispatch('openFeed');
					},
					openDiscussionSettings: function(){
						alert('settings');
					},
					clearReply: function() {
						var vueInstance = this;
						vueInstance.commentReplyActive = null;
						vueInstance.discussion.continue.inputComment.reply = '';
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
						var vueInstance = this;
						vueInstance.$dispatch('startDiscussion');
					},
					addToPortal: function(el){
						var vueInstance = this;
						vueInstance.$dispatch('addLinkToPortal');
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
						var vueInstance = this;
						self.document.getElementById("highestRated").style['border-bottom'] = '10px solid #31b7d9';
						self.document.getElementById("highestRated").getElementsByTagName("p")[0].style['color'] = '#31b7d9';
						self.document.getElementById("mostRecent").style['border-bottom'] = '10px solid #fcfcfd';
						self.document.getElementById("mostRecent").getElementsByTagName("p")[0].style['color'] = '#727272';
						vueInstance.$dispatch('updateHighestRated');
					},
					loadMostRecent: function(){
						var vueInstance = this;
						self.document.getElementById("mostRecent").style['border-bottom'] = '10px solid #31b7d9';
						self.document.getElementById("mostRecent").getElementsByTagName("p")[0].style['color'] = '#31b7d9';
						self.document.getElementById("highestRated").style['border-bottom'] = '10px solid #fcfcfd';
						self.document.getElementById("highestRated").getElementsByTagName("p")[0].style['color'] = '#727272';
						vueInstance.$dispatch('updateMostRecent');
					}
				},
				ready: function(){
					var vueInstance = this;
					if(vueInstance.feed.screens.chat.chatList.length === 0){
						vueInstance.feed.screens.chat.empty = true;
					}
					else{
						vueInstance.bringToFocus();
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
						var vueInstance = this;
						vueInstance.$dispatch('formSubmit');
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
								active: false,
								empty: false,
								chatList: [],
								sortBy: 'highestRated'
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
							active: false,
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
							active: false,
							topic:{
								id:'',
								heading:'',
								detail:{
									text: '',
									showFull: false
								},
								liked: false,
								likeCount: {
									count: '',
									style: {
										color: '#8D989E'
									}
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
							commentCount: '',
							comments: []
						},
						tempDiscussion: []				//temporary to be removed after api integration
					},
					portal:{
						active: false
					}
				},
				methods:{
					openPortalScreen: function(){
						var vueInstance = this;
						vueInstance.discussion.active= false;
						vueInstance.form.active= false;
						vueInstance.portal.active= true;
						vueInstance.feed.active= false;
						vueInstance.changeFeedScreen('chat');
					},
					updateDuration: function(){
						var vueInstance = this;
						setInterval(function(){
							if(vueInstance.feed.active && vueInstance.feed.screens.chat.active){
								vueInstance.feed.screens.chat.chatList.forEach(function(chat){
									chat.addedInDuration = vueInstance.timeSince(chat.added);
								});
							}
							else if(vueInstance.discussion.active && vueInstance.discussion.continue.active){
								vueInstance.discussion.continue.added = vueInstance.timeSince(vueInstance.discussion.tempDiscussion[vueInstance.discussion.continue.topic.id].added);
							}
						}, 10000);
					},
					timeSince: function(date){
						var seconds = Math.floor((new Date() - date) / 1000);

						var interval = Math.floor(seconds / 31536000);

						if (interval >= 1) {
							return interval==1? "A year ago": interval + " years ago";
						}
						interval = Math.floor(seconds / 2592000);
						if (interval >= 1) {
							return interval==1? "One month ago": interval + " months ago";
						}
						interval = Math.floor(seconds / 86400);
						if (interval >= 1) {
							return interval==1?"One Day ago": interval + " days ago";
						}
						interval = Math.floor(seconds / 3600);
						if (interval >= 1) {
							return interval==1?"An hour ago":interval + " hours ago";
						}
						interval = Math.floor(seconds / 60);
						if (interval >= 1) {
							return interval==1?"A minute ago": interval + " minutes ago";
						}
						return "Just Now";
					},
					commentCounter: function(){
						var vueInstance = this;
						var i = 0;
						vueInstance.discussion.continue.comments.forEach(function(obj){
							i++;
							i+=obj.replies.length;
						});
						if(i==0){
							return '';
						}
						else if(i==1){
							return '1 Reply';
						}
						else {
							return i+' Replies';
						}
					},
					viewDiscussionScreen: function(){
						var vueInstance = this;
						vueInstance.feed.active = false;
						vueInstance.discussion.active = vueInstance.discussion.continue.active = true;
						vueInstance.discussion.start.webLink.active = false;
						vueInstance.discussion.start.active = false;
						vueInstance.form.active= false;
						vueInstance.portal.active= false;
						vueInstance.adjustPopupDimension();
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
						var vueInstance = this;
						self.document.getElementsByTagName("html")[0].style.height="600px";
						if(vueInstance.form.active) {
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
						var vueInstance = this;
						vueInstance.discussion.active= false;
						vueInstance.form.active= false;
						vueInstance.portal.active= false;
						vueInstance.feed.active= true;
						vueInstance.changeFeedScreen('chat');
						vueInstance.adjustPopupDimension();
					},
					openLoginScreen : function(){
						var vueInstance = this;
						vueInstance.discussion.active= false;
						vueInstance.form.active= true;
						vueInstance.feed.active= false;
						vueInstance.portal.active= false;
						vueInstance.adjustPopupDimension();
					},
					startDiscussionScreen : function(){
						var vueInstance = this;
						vueInstance.discussion.start =
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
						vueInstance.feed.active = false;
						vueInstance.discussion.active = true;
						vueInstance.discussion.start.webLink.active = false;
						vueInstance.discussion.continue.active = false;
						vueInstance.form.active= false;
						vueInstance.portal.active= false;
						vueInstance.adjustPopupDimension();
					},
					updateFeedLastComment: function(topicId, lastComment){
						var vueInstance = this;
						vueInstance.feed.screens.chat.chatList.some(function(chat){
							if(chat.topicId === topicId)
								chat.latestComment= {
									profilePic : lastComment.profilePicSrc,
									profileName: lastComment.name,
									comment: lastComment.detail
								}
						});
					}
				},
				events:{
					addLinkToPortal: function(){
						//add link to portal api
						//on success shift to portal success screen

						var vueInstance = this;
						vueInstance.openPortalScreen();
					},
					likeAction: function(idObject){
						var vueInstance = this;
						if(idObject.topicId){
							if(!idObject.commentId && !idObject.replyId){
								//topic liked
								//update to api
								vueInstance.discussion.tempDiscussion[idObject.topicId].topic.liked = !vueInstance.discussion.tempDiscussion[idObject.topicId].topic.liked;
								vueInstance.discussion.continue.topic.liked = vueInstance.discussion.tempDiscussion[idObject.topicId].topic.liked;
								vueInstance.discussion.tempDiscussion[idObject.topicId].topic.likeCount.style.color = vueInstance.discussion.tempDiscussion[idObject.topicId].topic.liked ? '#31B7D9' : '#8D989E';
								vueInstance.discussion.continue.topic.likeCount.style.color = vueInstance.discussion.tempDiscussion[idObject.topicId].topic.likeCount.style.color;
								vueInstance.discussion.tempDiscussion[idObject.topicId].topic.likeCount.count = vueInstance.discussion.tempDiscussion[idObject.topicId].topic.liked ? '1' : '';	//to updated from api
								vueInstance.discussion.continue.topic.likeCount.count = vueInstance.discussion.tempDiscussion[idObject.topicId].topic.likeCount.count;	//to updated from api
								vueInstance.feed.screens.chat.chatList.some(function(obj){
									if(obj.topicId === parseInt(idObject.topicId)){
										obj.likeCount = parseInt(vueInstance.discussion.tempDiscussion[idObject.topicId].topic.likeCount.count)||0;
									}
								});
							}
							else if(idObject.commentId && !idObject.replyId){
								//comment liked
								//update to api
								vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].liked = !vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].liked;
								vueInstance.discussion.continue.comments[idObject.commentId].liked = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].liked;
								vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].likeCount.style.color = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].liked ? '#31B7D9' : '#8D989E';
								vueInstance.discussion.continue.comments[idObject.commentId].likeCount.style.color = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].likeCount.style.color;
								vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].likeCount.count = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].liked ? '1' : '';	//to updated from api
								vueInstance.discussion.continue.comments[idObject.commentId].likeCount.count = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].likeCount.count;	//to updated from api
							}
							else if(idObject.commentId && idObject.replyId){
								//reply liked
								//update to api
								vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].liked = !vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].liked;
								vueInstance.discussion.continue.comments[idObject.commentId].replies[idObject.replyId].liked = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].liked;
								vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].likeCount.style.color = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].liked ? '#31B7D9' : '#8D989E';
								vueInstance.discussion.continue.comments[idObject.commentId].replies[idObject.replyId].likeCount.style.color = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].likeCount.style.color;
								vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].likeCount.count = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].liked ? '1' : '';	//to updated from api
								vueInstance.discussion.continue.comments[idObject.commentId].replies[idObject.replyId].likeCount.count = vueInstance.discussion.tempDiscussion[idObject.topicId].comments[idObject.commentId].replies[idObject.replyId].likeCount.count;	//to updated from api
							}
						}
					},
					uploadReply: function(commentID, topicId){
						var vueInstance = this;
						//upload reply to api
						//on success add reply to comment object donot change screen

						// on success
						var replyObj = {
							id: vueInstance.discussion.tempDiscussion[topicId].comments[commentID].replies.length+ '',
							name: vueInstance.user.name,
							text: vueInstance.discussion.continue.inputComment.reply,
							liked: false,
							likeCount: {
								count: '',
								style: {
									color: '#8D989E'
								}
							},
							imgSrc: vueInstance.user.profilePicSrc
						};
						self.Vue.set(vueInstance.discussion.tempDiscussion[topicId].comments[commentID].replies, vueInstance.discussion.tempDiscussion[topicId].comments[commentID].replies.length+ '', replyObj);
						vueInstance.updateFeedLastComment(topicId, {
							name:replyObj.name,
							profilePicSrc:replyObj.imgSrc,
							detail:replyObj	.text
						});
						vueInstance.discussion.continue.inputComment.reply ='';
						vueInstance.discussion.continue.comments = vueInstance.discussion.tempDiscussion[topicId].comments;
						vueInstance.discussion.continue.commentCount = vueInstance.commentCounter();
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
							liked: false,
							likeCount: {
								count: '',
								style: {
									color: '#8D989E'
								}
							},
							replies: []
						};
						self.Vue.set(vueInstance.discussion.tempDiscussion[topicId].comments, vueInstance.discussion.tempDiscussion[topicId].comments.length +'', commentObj);
						vueInstance.updateFeedLastComment(topicId, {
							name:commentObj.name,
							profilePicSrc:commentObj.imgSrc,
							detail:commentObj.text
						});
						vueInstance.discussion.continue.inputComment.mainComment ='';
						vueInstance.discussion.continue.comments = vueInstance.discussion.tempDiscussion[topicId].comments;
						vueInstance.discussion.continue.commentCount = vueInstance.commentCounter();
					},
					viewDiscussion: function(topicId){
						var vueInstance = this;
						//get topic from server via ID
						//update the discussion.continue Object
						//right now local temp object is used
						//text.replace(/\r?\n/g, '<br />');
						vueInstance.discussion.continue.topic.id = topicId;
						vueInstance.discussion.continue.topic.heading = vueInstance.discussion.tempDiscussion[topicId].topic.heading;
						vueInstance.discussion.continue.topic.detail.text = vueInstance.discussion.tempDiscussion[topicId].topic.detail;
						vueInstance.discussion.continue.topic.liked = vueInstance.discussion.tempDiscussion[topicId].topic.liked;
						vueInstance.discussion.continue.topic.likeCount = vueInstance.discussion.tempDiscussion[topicId].topic.likeCount;
						vueInstance.discussion.continue.note.active = vueInstance.discussion.tempDiscussion[topicId].note.text.length > 0;
						vueInstance.discussion.continue.note.text = vueInstance.discussion.tempDiscussion[topicId].note.text;
						vueInstance.discussion.continue.added = vueInstance.timeSince(vueInstance.discussion.tempDiscussion[topicId].added);
						// update Comment object as well
						vueInstance.discussion.continue.comments = vueInstance.discussion.tempDiscussion[topicId].comments;
						vueInstance.discussion.continue.commentCount = vueInstance.commentCounter();

						vueInstance.viewDiscussionScreen();
					},
					uploadDiscussion: function(){
						var vueInstance = this;
						//upload data to api
						vueInstance.discussion.tempDiscussion.push(vueInstance.discussion.start);
						var topicId = vueInstance.discussion.tempDiscussion.indexOf(vueInstance.discussion.start);
						vueInstance.discussion.tempDiscussion[topicId].topic.topicId = topicId;
						vueInstance.discussion.tempDiscussion[topicId].topic.liked = false;
						vueInstance.discussion.tempDiscussion[topicId].topic.likeCount = {
							count: '',
							style: {
								color:'#8D989E'
							}
						};
						vueInstance.discussion.tempDiscussion[topicId].added = Date.now();
						vueInstance.discussion.tempDiscussion[topicId].comments = [];
						//show loader
						// upload to api
						// update chatlist from response
						vueInstance.feed.screens.chat.empty = false;
						vueInstance.feed.screens.chat.chatList .push({
							topicName: vueInstance.discussion.start.topic.heading,
							topicId : topicId,
							added: vueInstance.discussion.tempDiscussion[topicId].added,
							addedInDuration : vueInstance.timeSince(vueInstance.discussion.tempDiscussion[topicId].added),
							likeCount: parseInt(vueInstance.discussion.tempDiscussion[topicId].topic.likeCount.count) || 0,
							latestComment: {
								profilePic : vueInstance.user.profilePicSrc,
								profileName: vueInstance.user.name,
								comment: vueInstance.discussion.start.topic.detail
							}
						});
						vueInstance.openFeedScreen();
					},
					updateHighestRated: function(){
						var vueInstance = this;
						//update from api
						vueInstance.feed.screens.chat.sortBy = "highestRated"


					},
					updateMostRecent: function(){
						var vueInstance = this;
						//update from api
						vueInstance.feed.screens.chat.sortBy = "mostRecent"

					},
					changeFeed: function(screenId){
						var vueInstance = this;
						vueInstance.changeFeedScreen(screenId);
					},
					formSubmit: function(){
						var vueInstance = this;
						vueInstance.form.formError.active = !vueInstance.form.emailId || vueInstance.form.emailId.indexOf('@') === -1 || !vueInstance.form.pwd;
						if(!vueInstance.form.emailId && !vueInstance.form.pwd){
							vueInstance.form.formError.text = "Please enter email and password"
						}
						else if(!vueInstance.form.emailId || vueInstance.form.emailId.indexOf('@') === -1){
							vueInstance.form.formError.text = "Please enter valid email address"
						}
						else if(!vueInstance.form.pwd){
							vueInstance.form.formError.text = "Please enter password"
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
						var vueInstance = this;
						vueInstance.startDiscussionScreen();
					},
					openFeed: function(){
						var vueInstance = this;
						vueInstance.openFeedScreen();
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
					this.updateDuration();
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