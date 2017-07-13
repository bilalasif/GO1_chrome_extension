if(typeof ContentApp !== 'function'){
	function ContentApp(window, document,chrome){
		var self = this;
		this.chrome = chrome;
		this.window = window;
		this.document = document;
		this._initMessageListener();
		this.chrome.storage.sync.get({"loggedIn":false}, function (resp) {
			if(resp.loggedIn){
				self._initHighlightHandler();
			}
		});
	}
	ContentApp.prototype = {
		createNoteSpan: null,
		rangeNodes: [],
		imgSrc: null,
		description: null,
		title: null,

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
		initHighlighter: function(){
			this._initHighlightHandler();
		},
		findAncestor: function (el, target) {
		while ((el = el.parentElement) && !(el===target));
		return el;
		},
		_initHighlightHandler: function(){
			var self = this;
			this.document.onmouseup = function (e) {
				if ( !self.createNoteSpan || (self.createNoteSpan && !(self.findAncestor(e.target, self.createNoteSpan) || e.target === self.createNoteSpan))) {
					var selectedTextObject;
					var selectedText;
					if (self.window.getSelection) {
						selectedTextObject = self.window.getSelection();
						selectedText = selectedTextObject.toString();
					} else if (self.document.selection && self.document.selection.type != "Control") {
						selectedTextObject = self.document.selection.createRange();
						selectedText = selectedTextObject.text;
					}
					self.clearPreviousSelection();
					if (selectedText.length > 0) {
						console.log("X: " + e.pageX + " Y: " + e.pageY);
						self._createNoteTooltip(selectedTextObject, e.pageX, e.pageY);
					}
				}
			};
		},
		highlightSelection: function(){
			var self = this;
			if(self.createNoteSpan) {
				self.createNoteSpan.parentElement.removeChild(self.createNoteSpan);
				self.createNoteSpan = null;
			}
			if(self.rangeNodes.length > 0){
				for(var i=0; i < self.rangeNodes.length; i++){
					self.rangeNodes[i].removeEventListener("mouseenter", self._addOpacity.bind(self.createNoteSpan));
					self.rangeNodes[i].removeEventListener("mouseleave", self._removeOpacity.bind(self.createNoteSpan));
					self.rangeNodes[i].className += ' highlight';
				}
				self.rangeNodes = [];
			}
		},
		_addOpacity: function(event){
			this.style.opacity = '1';
		},
		_removeOpacity: function(event){
			this.style.opacity = '0';
		},
		_createButtons: function(selectedText){
			var self = this;
			var buttonWrapper = this.document.createElement('div');
			var createPublicNote = this.document.createElement('div');
			var createPrivateNote = this.document.createElement('div');
			var publicNoteimg = this.document.createElement('img');
			var privateNoteimg = this.document.createElement('img');
			var publicNote = this.document.createElement('p');
			var privateNote = this.document.createElement('p');
			var importStyle = this.document.createElement('style');
			importStyle.innerHTML = " @import '" + self.chrome.runtime.getURL('/stylesheets/contentStyle.css')+"'; ";
			publicNoteimg.src = this.chrome.runtime.getURL('/Resources/images/createNote.PNG');
			privateNoteimg.src = this.chrome.runtime.getURL('/Resources/images/createPrivateNote.PNG');
			buttonWrapper.className = 'noteWrapper';
			createPublicNote.className = 'createNoteButton public clearfix';
			publicNote.innerText = 'Create Note';
			createPrivateNote.className = 'createNoteButton  private clearfix';
			privateNote.innerText = 'Private Note';
			createPublicNote.appendChild(publicNoteimg);
			createPublicNote.appendChild(publicNote);
			createPublicNote.addEventListener('click', function(event){
				self.chrome.storage.sync.set({'lastSelectedText':selectedText});
			});
			createPrivateNote.appendChild(privateNoteimg);
			createPrivateNote.appendChild(privateNote);
			createPrivateNote.addEventListener('click', function(event){
				//self.chrome.storage.sync.set({'lastSelectedText':selectedText});
			});
			buttonWrapper.appendChild(createPublicNote);
			buttonWrapper.appendChild(createPrivateNote);
			var shadowRoot = this.createNoteSpan.attachShadow({mode: 'open'});
			shadowRoot.innerHTML = importStyle.outerHTML;
			shadowRoot.appendChild(buttonWrapper)
		},
		clearPreviousSelection: function(){
			if(this.createNoteSpan) {
				if(this.createNoteSpan.parentElement){
					this.createNoteSpan.parentElement.removeChild(this.createNoteSpan);
				}
				this.createNoteSpan = null;
			}
			if(this.rangeNodes.length > 0){
				for(var i=0; i < this.rangeNodes.length; i++){
					this.rangeNodes[i].removeEventListener("mouseenter", this._addOpacity.bind(this.createNoteSpan));
					this.rangeNodes[i].removeEventListener("mouseleave", this._removeOpacity.bind(this.createNoteSpan));
					this.rangeNodes[i].className = '';
				}
				this.rangeNodes = [];
			}
			this.chrome.storage.sync.set({'lastSelectedText':''});
		},
		_createNoteTooltip: function(selectedTextObject, locX, locY){
			var self = this;
			this.createNoteSpan = this.document.createElement('span');
			this.createNoteSpan.className = 'createNote';
			this._createButtons(selectedTextObject.toString());
			this.createNoteSpan.style.top = (locY-120)+'px';
			this.createNoteSpan.style.left = (locX-120)+'px';
			this.createNoteSpan.addEventListener("mouseenter", self._addOpacity.bind(self.createNoteSpan));
			this.createNoteSpan.addEventListener("mouseleave", self._removeOpacity.bind(self.createNoteSpan));
			this._highlightText(selectedTextObject);
			this.document.body.appendChild(this.createNoteSpan);
		},
		_highlightText: function(selectedTextObject){
			var safeRanges = this._getSafeRanges(selectedTextObject.getRangeAt(0));
			for (var i = 0; i < safeRanges.length; i++) {
				this.rangeNodes.push(this._highlightRange(safeRanges[i]));
			}
		},
		_highlightRange: function (range) {
			var self = this;
			var newNode = this.document.createElement("span");
			newNode.className = 'selectedText';
			newNode.addEventListener("mouseenter", self._addOpacity.bind(self.createNoteSpan));
			newNode.addEventListener("mouseleave", self._removeOpacity.bind(self.createNoteSpan));
			range.surroundContents(newNode);
			return newNode;
		},
		_getSafeRanges: function(dangerous) {
			var self = this;
			var a = dangerous.commonAncestorContainer;
			var s = new Array(0), rs = new Array(0);
			if (dangerous.startContainer != a)
				for(var i = dangerous.startContainer; i != a; i = i.parentNode)
					s.push(i)
					;
			if (0 < s.length) for(var i = 0; i < s.length; i++) {
				var xs = self.document.createRange();
				if (i) {
					xs.setStartAfter(s[i-1]);
					xs.setEndAfter(s[i].lastChild);
				}
				else {
					xs.setStart(s[i], dangerous.startOffset);
					xs.setEndAfter(
							(s[i].nodeType == Node.TEXT_NODE)
									? s[i] : s[i].lastChild
					);
				}
				rs.push(xs);
			}
			var e = new Array(0), re = new Array(0);
			if (dangerous.endContainer != a)
				for(var i = dangerous.endContainer; i != a; i = i.parentNode)
					e.push(i)
					;
			if (0 < e.length) for(var i = 0; i < e.length; i++) {
				var xe = self.document.createRange();
				if (i) {
					xe.setStartBefore(e[i].firstChild);
					xe.setEndBefore(e[i-1]);
				}
				else {
					xe.setStartBefore(
							(e[i].nodeType == Node.TEXT_NODE)
									? e[i] : e[i].firstChild
					);
					xe.setEnd(e[i], dangerous.endOffset);
				}
				re.unshift(xe);
			}
			if ((0 < s.length) && (0 < e.length)) {
				var xm = self.document.createRange();
				xm.setStartAfter(s[s.length - 1]);
				xm.setEndBefore(e[e.length - 1]);
			}
			else {
				return [dangerous];
			}
			rs.push(xm);
			return rs.concat(re);
		},
		getMetaContent: function(){
			var self = this;
			var response = arguments[1];
			if(!this.imgSrc && !this.description && !this.title) {
				var metaTags = self.document.getElementsByTagName('meta');
				for (var i = 0; i < metaTags.length; i++) {
					if (metaTags[i].getAttribute("property") == "og:image") {
						this.imgSrc = metaTags[i].getAttribute("content");
					}
					if (metaTags[i].getAttribute("property") == "og:description") {
						this.description = metaTags[i].getAttribute("content");
					}
					if (metaTags[i].getAttribute("property") == "og:title") {
						this.title = metaTags[i].getAttribute("content");
					}
				}
			}
			response({
				url: self.window.location.href,
				imgSrc:this.imgSrc||self.document.getElementsByTagName('img')[0].src,
				desc:this.description||decodeURIComponent(self.document.getElementsByTagName('title')[0].innerText),
				title:this.title||decodeURIComponent(self.document.getElementsByTagName('title')[0].innerText)
			});
		}
	}
}
if(!window.GO1){
	window.GO1 = {};
}
window.GO1.contentApp = new ContentApp (window, document,chrome);