"use strict";
(function() {
    var a = !!document.querySelector("script[src*=\"kaspersky\"]"),
        b = document.createElement("canvas"),
        c = !!(b.getContext("webgl") || b.getContext("experimental-webgl")),
        d = [];
    if (c || d.push("WebGL"), "undefined" == typeof WebAssembly && d.push("WebAssembly"), 0 === d.length && !a) window["C3_IsSupported"] = !0;
    else {
        var e = document.createElement("div");
        e.id = "notSupportedWrap", document.body.appendChild(e);
        var f = document.createElement("h2");
        f.id = "notSupportedTitle", f.textContent = a ? "Kaspersky Internet Security broke this export" : "Software update needed", e.appendChild(f);
        var g = document.createElement("p");
        g.className = "notSupportedMessage";
        var h = "This content is not supported because your device's software is out-of-date. ",
            i = navigator.userAgent;
       
	  
	}
})();