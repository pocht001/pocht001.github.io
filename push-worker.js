var host_url = "https://gravitec.net/";
var app_key = "7085f0696b0c3f4188abab5ca12c055b";

var onInstallFuncShim = 0,
	onActivateFuncShim = 0,
	onPushFuncShim = 0,
	onPushClickFuncShim = 0;

importScripts(host_url + 'push/push-worker-shim.js');

var onInstall = onInstallFuncShim || onInstallFunc;
var onActivate = onActivateFuncShim || onActivateFunc;
var onPush = onPushFuncShim || onPushFunc;
var onPushClick = onPushClickFuncShim || onPushClickFunc;

self.addEventListener('install', function (event) {
	sendMessage("Trace worker", 'install', true);
	event.waitUntil(onInstall(event));
});

self.addEventListener('activate', function (event) {
	sendMessage("Trace worker", 'activate', true);
	event.waitUntil(onActivate(event));
});

self.addEventListener('push', function (event) {
	sendMessage("tracing SW Push", "Begin Push Event", true);
	return event.waitUntil(onPush(event));
});

self.addEventListener('notificationclick', function (event) {
	return event.waitUntil(Promise.all(onPushClick(event)));
});

function onInstallFunc(event) {
	return skipWaiting();
}

function onActivateFunc(event) {
	return clients.claim();
}

function onPushFunc(event) {
	return self.registration.pushManager.getSubscription().then(function (subscription) {
		sendMessage('tracing SW Push with subscription', 'Begin Push Event', true, subscription && (subscription.subscriptionId || subscription.endpoint));
		var regID;
		try {
			regID = prepareId(subscription).gid;
		}
		catch (e) {
			sendMessage("Error parsing gid", e, false, subscription);
			return onErrorMessage();
		}

		if (event.data) {
			return showNotifications([event.data.json()], regID);
		}
		return fetch(host_url + "api/sites/lastmessage/?regID=" + encodeURIComponent(regID) + "&app_key=" + app_key + "&version=" + (version || 1))
			.then(function (response) {
				if (response.status < 200 || response.status >= 300) {
					if (logging) console.log('Looks like there was a problem. Status Code: ' + response.status);
					sendMessage("Last message fetching error", {
						errorCode: response.status,
						errorMessage: response.statusText
					}, false, regID);
					return onErrorMessage();
				}
				return response.json().then(function (jsons) {
					if (!jsons || (jsons instanceof Array && jsons.length == 0)) {
						console.log('The API returned an error.');
						sendMessage("Last message response object error", 'The API returned an error.', false, regID);
						return onErrorMessage();
					}
					return showNotifications(jsons, regID);
				}).catch(function (err) {
					sendMessage("Error parsing last message response json", err, false, regID);
					return onErrorMessage();
				});
			})
			.catch(function (err) {
				sendMessage("Last message fetching request error", err, false, regID);
				return onErrorMessage();
			});
	}).catch(function (err) {
		sendMessage("Error during getSubscription()", err, false);
		return onErrorMessage();
	});
}

function onErrorMessage() {
	var title = 'ýýýýýý ýýýýýýýýýýýýýýýýýý ýýýýýýýýýýýýýýýýýý GCM';
	var message = 'ýýýýýýýýýýýýýýýýýýýý, ýýýý ýýýýýýýýýýýýýýýýýýýýýýýýýýýý ýýýýýýýýýýýýýý ýýýýýýýýýýýýýýýý ýý ýýýýýýýýýýýýýýýý ýýýýýý ýýýýýýýýýýýýýýýýýýýýýý';
	var notificationTag = 'notification-error';
	return self.registration.showNotification(title, {
		body: message,
		tag: notificationTag
	});
}

function onPushClickFunc(event) {
	var notification = event.notification;
	var data = getNotificationData(notification) || {};
	var url = decodeURI(data.url);
	var buttonData;
	var promiseAction, promiseRequest;
	sendMessage('Tracing push click data', data, true);

	if (event.action) {
		buttonData = data.buttons[event.action];
		if (buttonData.url) {
			promiseAction = clientActions(decodeURI(buttonData.url), buttonData.action);
		}
		if (buttonData.request) {
			promiseRequest = fetch(decodeURI(buttonData.request));
		}
	}
	else if (url) {
		promiseAction = clientActions(url, data.action);
		promiseRequest = fetch(host_url + "api/sites/" + data.messageid + "/read?version=" + (version || 1));
	}
	promiseRequest.catch(function (err) {
		sendMessage("Error fetching read", err, false);
	});

	notification.close();
	return [promiseAction || Promise.resolve(), promiseRequest || Promise.resolve()];
}

function showNotifications(jsons, regID) {
	try {
		sendMessage("Trace worker", 'showNotifications executed', true, regID);
		var i, nots = [];
		if (jsons instanceof Array) {
			for (i = 0; i < jsons.length; i++) {
				nots.push(showNotification(jsons[i], regID));
				fetch(host_url + "api/sites/receive/" + jsons[i].id + "?version=" + (version || 1)).catch(function (err) {
					sendMessage("Error fetching receive", err, false, regID);
				});
			}
			return nots[0];
		}
		var notif = showNotification(jsons, regID);
		fetch(host_url + "api/sites/receive/" + jsons.id + "?version=" + (version || 1)).catch(function (err) {
			sendMessage("Error fetching receive", err, false, regID);
		});
	}
	catch (e) {
		sendMessage("Error iterating over messages", e, false, regID);
	}
	return notif;
}

function showNotification(json, regID) {
	sendMessage("Trace worker", 'showNotification executed', true, regID);
	var notifData = {};
	var notifOptions = {};
	var displayDuration = json.duration;
	var notifId = json.id;

	notifData.messageid = json.id;
	notifData.url = encodeURI(json.redirect);
	notifData.action = json.action;
	notifData.buttons = generateButtonsData(json.buttons);

	notifOptions.body = json.tx;
	notifOptions.icon = (json.icon || 'http://www.mykitchenshrink.com/wp-content/uploads/2013/11/Icon-Message.png') + '?' + generateQueryString(notifData);
	notifOptions.vibrate = json.vibrate || [];
	notifOptions.direction = json.direction || 'auto';
	notifOptions.actions = generateButtons(json.buttons);
	notifOptions.data = notifData;
	notifOptions.requireInteraction = true;
	return self.registration.showNotification(json.tl || "Title", notifOptions).then(function () {
		if (displayDuration) {
			setTimeout(function () {
				closeNotifications(notifId)
			}, displayDuration * 1000);
		}
	});
}

function generateQueryString(data) {
	var params = [];
	for (var i in data) {
		params.push(i + '=' + (typeof data[i] === 'string' ? data[i] : JSON.stringify(data[i])));
	}
	return params.join('&');
}

function parseQueryString(str) {
	var data = {};
	var params = str.split('&');
	var param;
	for (var i in params) {
		param = params[i].split('=');
		data[param[0]] = param[1];
	}
	return data;
}

function closeNotifications(id) {
	self.registration.getNotifications().then(function (notifications) {
		var data;
		for (var i = 0; i < notifications.length; ++i) {
			if (id) {
				data = getNotificationData(notifications[i]);
				if (id == data.messageid) {
					notifications[i].close();
					return;
				}
			}
			else {
				notifications[i].close();
			}
		}
	});
}

function getNotificationData(notification) {
	return notification.data || parseQueryString((notification.icon || notification.iconUrl).split('?')[1]);
}

function generateButtonsData(buttons) {
	buttons = buttons || [];
	var button;
	var data = {};
	for (var i = 0, l = buttons.length; i < l; i++) {
		button = buttons[i];
		data[button.type + i] = {
			url: encodeURI(button.url),
			request: encodeURI(button.request),
			action: button.action
		};
	}
	return data;
}

function generateButtons(buttons) {
	buttons = buttons || [];
	var button;
	var actions = [];
	for (var i = 0, l = buttons.length; i < l; i++) {
		button = buttons[i];
		actions.push({
			action: button.type + i,
			title: button.title,
			icon: button.icon
		});
	}
	return actions;
}

function prepareId(subscription, additions) {
	additions = additions || {};
	var i, browser;
	var subscriptionId = (subscription && 'subscriptionId' in subscription) ? subscription.subscriptionId : subscription && subscription.endpoint;
	var browsers = [
		{
			name: 'CHROME',
			prefix: 'https://android.googleapis.com/gcm/send/'
		},
		{
			name: 'FIREFOX',
			prefix: 'https://updates.push.services.mozilla.com/push/'
		}
	];
	for (i = 0; i < browsers.length; i++) {
		browser = browsers[i];
		if (~subscriptionId.indexOf(browsers[i].prefix)) {
			additions.gid = subscriptionId.split(browsers[i].prefix)[1];
			additions.browser = browsers[i].name;
		}
	}
	additions.gid = additions.gid || subscription.split('/').pop();
	return additions;
}

function sendMessage(subject, error, isTrace, token) {
	var promise = Promise.resolve(typeof token == 'string' ? token : JSON.stringify(token));
	if (!token) {
		promise = self.registration.pushManager.getSubscription().then(function (subscription) {
			var prepared = prepareId(subscription);
			return Promise.resolve(prepared && prepared.gid);
		}).catch(function(err) {
			return Promise.resolve(null);
		});
	}
	if (typeof error != 'string')
		error = JSON.stringify(error.message ? error.message : error);
	error = (subject || "No subject") + ": " + error;

	return promise.then(function(token) {
		var errorUrl = host_url + 'api/sites/' + (isTrace ? 'logtraceworker' : 'logworkerrors') + '/?app_key=' + app_key + '&token=' + token + '&time=' + Math.floor(Date.now() / 1000) + "&version=" + (version || 1);
		return fetch(errorUrl, {
			method: 'post',
			body: error
		});
	});
}

function clientActions(url, action) {
	if (url) {
		if (action === 'open' && clients.openWindow) {
			return self.clients.openWindow(url);
		}
		return self.clients.matchAll({
			type: "window"
		})
			.then(function (windowClients) {
				var i, client, promise;
				for (i = 0; i < windowClients.length; i++) {
					client = windowClients[i];
					if ('focus' in client && client.url.indexOf(url) === 0) {
						promise = client.focus();
						if (action === 'focus') {
							return promise;
						}
					}
				}
				if (!action) {
					return self.clients.openWindow(url);
				}
			});
	}
	return Promise.reject();
}
