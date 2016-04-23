(function() {
	var collectors = {
		"MLA": {
			"client_id": "8915767188486910",
			"client_secret": "L9yAtxq4RPhBAArbVXfiSMbZvihFiCUf"
		},
		"MLB": {
			"client_id": "1498091458334340",
			"client_secret": "RQggDMA2g6V9saeZKVSMh2WxZWWCpbCd"
		},
		"MLM": {
			"client_id": "5437095693898413",
			"client_secret": "mnYiKZ3p0V943Gx3IxLVzGOxKj27XIRb"
		},
		"MLV": {
			"client_id": "630121165566171",
			"client_secret": "F25NdU4PPyWJ3cltJWBhhQe8q4cSP9Ic"
		},
		"MCO": {
			"client_id": "8076214246968536",
			"client_secret": "ANLO8yH0EvFWW6O5a8iSEgYHWJW9u4fP"
		},
		"MLC": {
			"client_id": "3856579257398553",
			"client_secret": "UH1RawXin8oHgcAm5727ui4MY64cPZuW"
		},
		"MPE": {
			"client_id": "xxx",
			"client_secret": "xxx"
		}
	};

	function createAccessToken(client_id, client_secret) {

		fireEvent("collector_access_token:before");

		$.ajax({
			type: "POST",
			url: "https://api.mercadolibre.com/oauth/token",
			dataType: "json",
			data: {
				"grant_type": "client_credentials",
				"client_id": client_id,
				"client_secret": client_secret
			},
			success: function(data, status, xhr) {
				fireEvent("collector_access_token:done", data);
			},
			error: function(err) {
				fireEvent("collector_access_token:error", err);
			}
		});
	}

	function buildPreferenceJson() {

		var amount = document.getElementById("amount");
		var title = document.getElementById("title");
		var email = document.getElementById("email");

		var json = {
			"items": [{
				"title": title.value,
				"quantity": 1,
				"unit_price": parseFloat(amount.value),
			}]
		};

		if (!!email && email !== "") {
			json.payer = {
				"email": email.value
			}
		}

		return json;
	}

	function fireEvent(name, data) {
		var event = new CustomEvent(name, {
			"bubbles": true,
			"cancelable": true,
			"detail": data
		});
		return document.dispatchEvent(event);
	}

	function createPreference(accessToken) {
		fireEvent("create_preference:before");

		var json = buildPreferenceJson();

		$.ajax({
			type: "POST",
			url: "https://api.mercadolibre.com/checkout/preferences?access_token=" + accessToken,
			contentType: "application/json",
			dataType: "json",
			data: JSON.stringify(json),
			success: function(data, status, xhr) {
				fireEvent("create_preference:done", data);
			},
			error: function(err) {
				fireEvent("create_preference:error", err);
			}
		});
	}

	function initCollectors() {

		var el = document.getElementById("collectors");

		el.addEventListener("change", function() {
			var site = this.value;
			var collector = collectors[site];
			fireEvent("collector", collector);
			fireEvent("change_site", site);
		});

		document.addEventListener("collector", function(evt) {
			var collector = evt.detail;

			var client_id = document.getElementById("client_id");
			var client_secret = document.getElementById("client_secret");

			client_id.value = collector.client_id;
			client_secret.value = collector.client_secret;
		});

		var event = document.createEvent("Event");
		event.initEvent("change", true, true);
		el.dispatchEvent(event);
	}

	function initButtons() {
		var els = document.querySelectorAll("[data-js]");
		for (var k = 0, l = els.length; k < l; k++) {
			var el = els[k];
			el.addEventListener("click", function(evt) {
				evt.preventDefault();
				var action = this.getAttribute("data-js");
				switch (action) {
					case "create_preference":
						var client_id = document.getElementById("client_id");
						var client_secret = document.getElementById("client_secret");
						createAccessToken(client_id.value, client_secret.value)
						break;
					case "switch_site":
						var site = this.innerText;
						fireEvent("change_site", site);
						break;
					case "open_pool":
						fireEvent("open_preference");
						break;
					case "open_beta":
						fireEvent("open_preference", "beta");
						break;
					case "open_development":
						var protocol = this.getAttribute("data-protocol");
						fireEvent("open_development", protocol);
						break;
					case "render":
						var mode = this.getAttribute("data-mode");
						fireEvent("render", mode);
						break;
					default:
						console.log("TODO:", action);
						break;
				}
			});
		}
	}

	function showLoading() {
		var el = document.querySelector("[type=submit]");
		el.setAttribute("disabled", "disabled");
		el.innerText = "Espere...";
	}

	function hideLoading() {
		var el = document.querySelector("[type=submit]");
		el.removeAttribute("disabled");
		el.innerText = "Crear";
	}

	function handleError(error) {
		console.error(JSON.parse(error.detail.responseText));
	}

	function buildPreferenceUrl(pool) {

		var prefId = document.getElementById("pref_id").innerText;
		if (!prefId)
			return null;

		var pool = pool || document.getElementById("pool").getAttribute("data-pool");

		var url = "https://www.mercadopago.com/" + (pool && pool !== '' ? pool + "/" : "") + "checkout/pay?pref_id=" + prefId;

		return url;
	}

	function initEvents() {
		document.addEventListener("collector_access_token:done", function(evt) {
			var response = evt.detail;
			var accessToken = response.access_token;
			createPreference(accessToken);
		});

		document.addEventListener("create_preference:done", function(evt) {
			var response = evt.detail;
			var id = response.id;

			var el = document.getElementById("pref_id")
			el.innerText = id;
			hideLoading();
		});

		document.addEventListener("change_site", function(evt) {
			var site = evt.detail;

			var poolBtn = document.getElementById("pool");
			poolBtn.innerHTML = '<em class="glyphicon glyphicon-globe"></em> ' + site;
			poolBtn.setAttribute("data-pool", site !== "ROLA" ? site.toLowerCase() : "");
		});

		document.addEventListener("open_preference", function(evt) {
			var pool = evt.detail;
			var url = buildPreferenceUrl(pool);
			if (url) {
				var tab = window.open(url, '_blank');
				tab.focus();
			}
		});

		document.addEventListener("open_development", function(evt) {
			var prefId = document.getElementById("pref_id").innerText;
			if (!prefId) return;

			var protocol = evt.detail;
			var port = protocol === 'https' ? 8443 : 8080;

			var url = protocol + "://checkout-lite.mercadopadesa.com:" + port + "/checkout/pay?pref_id=" + prefId;

			var tab = window.open(url, '_blank');
			tab.focus();
		});

		document.addEventListener("open_iframe", function(evt) {

			var prefId = document.getElementById("pref_id").innerText;
			if (!prefId) return;

			var pool = document.getElementById("pool").getAttribute("data-pool");

			var url = "http://axcoro.github.io/checkout-tests/test.html?pref_id=" + prefId + "&mode=iframe&pool=" + pool;
			if (url) {
				var tab = window.open(url, '_blank');
				tab.focus();
			}
		});

		document.addEventListener("render", function(evt) {
			var mode = evt.detail;
			var url = buildPreferenceUrl();
			switch (mode) {
				case "iframe":
					fireEvent("open_iframe");
					break;
				default:
					$MPC.openCheckout({
						url: url,
						mode: mode
					});
					break;
			}
		});

		document.addEventListener("collector_access_token:before", function() {
			document.getElementById("pref_id").innerText = "";
		});

		document.addEventListener("collector_access_token:before", showLoading);

		document.addEventListener("collector_access_token:error", hideLoading);
		document.addEventListener("create_preference:error", hideLoading);

		document.addEventListener("collector_access_token:error", handleError);
		document.addEventListener("create_preference:error", handleError);
	}

	function initUI() {
		initEvents();
		initButtons();
		initCollectors();
	}

	initUI();
})();