exports.parseShipping = (shipping) => {
    const priceRegex = /\$[0-9]+.{1}[0-9]*/;
    const freeRegex = /free/i;

    if (shipping.search("This item cannot be shipped") > -1) {
        return "This item cannot be shipped to your location";
    }

    const priceMatch = shipping.match(priceRegex);
    if (priceMatch && priceMatch.length) {
        return priceMatch[0];
    }

    const freeMatch = shipping.match(freeRegex);
    if (freeMatch && freeMatch.length) {
        return "free";
    }

    return shipping;
};
