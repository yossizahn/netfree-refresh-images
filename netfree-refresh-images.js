if (!window.yzRefreshImages) {
    window.yzRefreshImages = (function (options) {

        var options = options || {};

        function getRandom() {
            return Math.floor(Math.random() * 0xffff).toString(16);
        }

        var nfoptRegex = /(?:\?)?&~nfopt\(([^\/]+)\)$/;
        var queryReqex = /(\?.*)?$/;
        var nfparam = "&~nfopt(r=" + getRandom() + ")";

        function clearNfopt(url) {
            return url.replace(nfoptRegex, '');
        }

        function setNfopt(url) {
            if (/^data:/.test(url)) return url; /* Data URLs don't like query strings */
            return clearNfopt(url).replace(queryReqex, function (_all, start) {
                return (start || '?') + nfparam;
            });
        }

        function refreshBackgroundImages(elm) {
            var bg = getComputedStyle(elm)["backgroundImage"];
            if (bg != "none") {
            elm.style.backgroundImage = bg.replace(/url\('?"?(.+?(?:\(r=[a-z0-9]{1,4}\))?)"?'?\)/g,
                (match, p) => { return "url(\"" + setNfopt(p) + "\")" });
            }
            /*
            TODO: How can I set backgound-image of pseudo elements via JS? 
            e.g. sometimes the :after and :before pseudo elements have backgound-image set. 
            see: https://stackoverflow.com/a/8051488/8997905
            */
        }

        function refreshSrcs(element, currentSrc) { 
            /*we pass in currentSrc, to allow  easy finding of the relevant src within srcset.
            It must be a seperate arg because it isn't available in <picture> elements.
            Another option would be, to parse "srcset" and refresh all images within */
            if (element.src) element.src = setNfopt(element.src);
            if (element.srcset) {
                element.srcset = element.srcset.replace(
                    /* currentSrc seems to contain the full path. 
                    Let's find the last element in the path since that's guaranteed to exist within the srcset
                    Potential BUG: Doing this stops us detecting data: URLs */
                    currentSrc.substr(currentSrc.lastIndexOf("/") + 1), (match) => { return setNfopt(match) }
                )
            }
        }

        function refreshImages(node, options) {
            for (element of node.querySelectorAll('*')) {

                refreshBackgroundImages(element);

                if (element instanceof HTMLImageElement) { /* <img> elements */
                    refreshSrcs(element, element.currentSrc);
                }

                if (element instanceof HTMLPictureElement) { /* <picture> elements*/
                    var cs;
                    for (subElement of element.children) { /* find currentSrc */
                        if (subElement instanceof HTMLImageElement) {
                            cs = subElement.currentSrc;
                        }
                    }
                    for (subElement of element.children) { /* find and update <source> tags */
                        if (subElement instanceof HTMLSourceElement) {
                            refreshSrcs(subElement, cs);
                        }
                    }
                }
                if (element.shadowRoot) { /*recurse into shadow root*/
                    refreshImages(element.shadowRoot);
                }

                if (element.contentDocument) { /* same-origin iframes */
                    refreshImages(element.contentDocument);
                }

                /* TODO: warn about iframes, refresh SVG elements */
            }
        }
        refreshImages(document, options);
    })
}
