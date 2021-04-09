const Apify = require('apify');

const { parseShipping } = require('./helpers/parseShipping');
const { TIME_MAIN_ELEMENT } = require('../src/const');

const {
    utils: { log },
} = Apify;

const {
    LABEL_DETAIL,
    LABEL_OFFERS,
    DETAIL_URL,
    OFFER_URL,
} = require('./const');

exports.handleList = async ({ page }) => {
    const requestQueue = await Apify.openRequestQueue();
    await page.waitForSelector('.s-search-results', {
        timeout: TIME_MAIN_ELEMENT,
    });
    const items = await page.$$('.s-search-results > .s-result-item.s-asin');

    for (const item of items) {
        const asin = await page.evaluate(
            (el) => el.getAttribute('data-asin'),
            item,
        );

        await requestQueue.addRequest(
            {
                url: `${DETAIL_URL}${asin}`,
                userData: { label: LABEL_DETAIL, asin },
            },
            { forefront: true },
        );
    }

    log.info(`Number of items on first page: ${items.length}`);
};

exports.handleDetail = async ({ request, page }) => {
    const { keyword } = await Apify.getInput();
    const {
        userData: { asin },
    } = request;

    await page.waitForSelector('#productTitle', {
        timeout: TIME_MAIN_ELEMENT,
    });
    const requestQueue = await Apify.openRequestQueue();
    const titleEl = await page.waitForSelector('title');
    const title = await page.evaluate((el) => el.textContent, titleEl);

    const descEl = await page.waitForSelector("meta[name='description']");
    const description = await page.evaluate((el) => el.content, descEl);

    const url = page.url();

    await requestQueue.addRequest(
        {
            url: `${OFFER_URL}${asin}`,
            userData: {
                label: LABEL_OFFERS,
                data: {
                    title,
                    url,
                    description,
                    keyword,
                },
            },
        },
        { forefront: true },
    );

    log.info('Scraping detail completed!');
};

exports.handleOffers = async ({ request, page }) => {
    const {
        userData: { data },
    } = request;

    await page.waitForSelector('#productTitle', {
        timeout: TIME_MAIN_ELEMENT,
    });
    await page.waitForTimeout(2000);
    await page.waitForSelector('#aod-container', {
        timeout: TIME_MAIN_ELEMENT,
    });
    await page.waitForTimeout(2000);

    const output = [];

    const pinnedOfferNameSelector =
        '.aod-pinned-offer #aod-offer-soldBy .a-col-right > .a-size-small';
    const pinnedOfferPriceSelector = '.aod-pinned-offer .a-price .a-offscreen';
    const pinnedOfferShippingSelector =
        '.aod-pinned-offer #pinned-offer-top-id .a-row:nth-of-type(3) .a-size-base.a-color-base';

    if (
        (await page.$(pinnedOfferNameSelector)) !== null &&
        (await page.$(pinnedOfferPriceSelector)) !== null &&
        (await page.$(pinnedOfferShippingSelector)) !== null
    ) {
        const pinnedOfferName = await page.$eval(
            pinnedOfferNameSelector,
            (el) => el.textContent.trim(),
        );
        const pinnedOfferPrice = await page.$eval(
            pinnedOfferPriceSelector,
            (el) => el.textContent.trim(),
        );
        const pinnedOfferShipping = await page.$eval(
            pinnedOfferShippingSelector,
            (el) => el.textContent.trim(),
        );

        output.push({
            ...data,
            sellerName: pinnedOfferName,
            price: pinnedOfferPrice,
            shippingPrice: parseShipping(pinnedOfferShipping),
        });
    }

    const noItems = await page.$('.aod-no-offer-normal-font');

    let loadNextPage = !noItems;
    while (loadNextPage) {
        // scroll to bottom of offers
        const scrollSectionSelector = '#all-offers-display-scroller';
        await page.evaluate((selector) => {
            const scrollSection = document.querySelector(selector);

            scrollSection.scrollTop = scrollSection.scrollHeight;
        }, scrollSectionSelector);
        await page.waitForTimeout(1000);

        const endOfResultsClass = await page.$eval(
            '#aod-footer #aod-end-of-results',
            (el) => el.className,
        );

        const seeMoreClass = await page.$eval(
            '#aod-footer #aod-show-more-offers',
            (el) => el.className,
        );

        if (seeMoreClass.search('aod-hide') < 0) {
            // link show more is visible -> click
            await page.click('#aod-footer #aod-show-more-offers');

            loadNextPage = true;
        } else {
            // end while when end of result text is visible otherwise scroll to end of next results
            loadNextPage = endOfResultsClass.search('aod-hide') > -1;
        }
    }

    const offers = await page.$$('#aod-offer-list > .a-section');
    if (offers.length) {
        for (const offer of offers) {
            const offerName = await offer.$eval(
                '#aod-offer-soldBy .a-col-right > .a-size-small',
                (el) => el.textContent.trim(),
            );
            const offerPrice = await offer.$eval(
                '.a-price .a-offscreen',
                (el) => el.textContent.trim(),
            );
            const offerShipping = await offer.$eval(
                '#aod-offer-price .a-col-right .a-col-left .a-size-base.a-color-base',
                (el) => el.textContent.trim(),
            );

            output.push({
                ...data,
                sellerName: offerName,
                price: offerPrice,
                shippingPrice: parseShipping(offerShipping),
            });
        }
    }

    log.info('Scraping offers completed!');

    return output;
};
