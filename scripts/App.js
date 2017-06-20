if(typeof App !== 'function'){
	function App(chrome){
		var self = this;
		this.chrome = chrome;
		this.chrome.browserAction.setPopup({popup:"/html/popup.html"});
		//this.chrome.browserAction.setBadgeText({text:"5"});
		//this.chrome.browserAction.setBadgeBackgroundColor({color:"#FF0000"});
	}
	App.prototype = {

	}
}
if(!window.GO){
	window.GO = {};
}
window.GO.backgroundApp = new App(chrome);