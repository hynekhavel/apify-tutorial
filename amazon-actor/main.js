const Apify = require('apify');
const randomUA = require('modern-random-ua');

const { handleOffers, handleList, handleDetail } = require('./src/routes');
const {
    SEARCH_URL,
    LABEL_LIST,
    LABEL_DETAIL,
    LABEL_OFFERS,
} = require('./src/const');

const MAX_CONCURRENCY = 1;
const MAX_REQUEST_RETRIES = 5;

const {
    utils: { log },
} = Apify;

Apify.main(async () => {
    let results = [];
    const { keyword } = await Apify.getInput();

    const requestList = await Apify.openRequestList('start-url', [
        {
            url: `${SEARCH_URL}${keyword}`,
            userData: { label: LABEL_LIST },
        },
    ]);
    const requestQueue = await Apify.openRequestQueue();
    const proxyConfiguration = await Apify.createProxyConfiguration();

    const launchOptions = {
        headless: false,
        defaultViewport: {
            width: 1024 + Math.floor(Math.random() * 100),
            height: 768 + Math.floor(Math.random() * 100),
        },
    };

    if (!Apify.isAtHome()) {
        launchOptions.executablePath = '/usr/bin/chromium-browser';
    }

    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        requestQueue,
        proxyConfiguration,
        useSessionPool: true,
        persistCookiesPerSession: true,
        maxConcurrency: MAX_CONCURRENCY,
        maxRequestRetries: MAX_REQUEST_RETRIES,
        launchContext: {
            useChrome: true,
            stealth: true,
            //userAgent: randomUA.generate(),
            launchOptions,
        },
        handlePageFunction: async (context) => {
            const {
                request: {
                    url,
                    userData: { label },
                },
                proxyInfo,
                session,
                page,
            } = context;

            try {
                log.info('Page opened.', {
                    label,
                    url,
                    proxy: proxyInfo.url,
                });

                await page.viewport({
                    width: 1024 + Math.floor(Math.random() * 100),
                    height: 768 + Math.floor(Math.random() * 100),
                });

                if (label === LABEL_LIST) {
                    await handleList(context);
                } else if (label === LABEL_DETAIL) {
                    await handleDetail(context);
                } else if (label === LABEL_OFFERS) {
                    const output = await handleOffers(context);
                    results = [...results, ...output];
                }

                session.markGood();
            } catch (err) {
                session.markBad();

                throw err;
            }
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');

    const dataset = await Apify.openDataset();
    await dataset.pushData(results);

    const datasetInfo = await dataset.getInfo();
    log.info(
        `Data saved to dataset: https://api.apify.com/v2/datasets/${datasetInfo.id}/items?clean=true&format=json`,
    );

    try {
        await Apify.call('apify/send-mail', {
            to: 'hynek@hynekhavel.cz',
            subject: 'Hynek Havel - This is for the Apify SDK exercise',
            text: `Link to dataset: https://api.apify.com/v2/datasets/${datasetInfo.id}/items?clean=true&format=json`,
        });
    } catch (err) {
        // call apify/send-mail throw weird error. Temporarily catched.
        log.warning(err);
    }
});
