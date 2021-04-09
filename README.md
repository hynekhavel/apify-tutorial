# Tutorial II Apify SDK

Scraping product search and details was pretty standard, but it looks like Amazon now showing products offers in side panel only. So I scraped side panel, but had to solve infinite scrolling to scrape every offer. I had little troubles with blocking, but with using sessions and proper retries I'm able to scrape all offers.

Example output: https://api.apify.com/v2/datasets/TViA97Lq6fZGEfX7V/items?clean=true&format=json

## Quiz

- Q: Where and how can you use JQuery with the SDK?
- A: You can use CheerioCrawler. Cheerio is basically jQuery but bor server use. Additionally you can inject jQuery to Puppeteer crawler -> puppeteer.injectJQuery

- Q: What is the main difference between Cheerio and JQuery?
- A: Cheerio is implementation of JQuery core for Node.js (server). It's basically the same syntax. Cheerio need to load HTML by load function -> cheerio.loadcheerio.load

- Q: When would you use CheerioCrawler and what are its limitations?
- A: On page with light scraper blocking. Cheerio is faster and consumes less server time, than heavier solution with headless chrome. But Cheerio can't scrape content on site that is dynamically loaded by JS. For loading this content is necessary to replicate fetch and load data that way or use Puppeteer. Cheerio is also much easier to block by targeted site.

- Q: What are the main classes for managing requests and when and why would you use one instead of another?
- A: RequestList and RequestQueue. RequestList is mainly for adding static list of URLs from input. RequestQueue can be used to add URLs dynamically for example when links are scraped from starting page.

- Q: How can you extract data from a page in Puppeteer without using JQuery?
- A: Puppeteer document.querySelector and has couple of build in functions for extracting data by selectors -> page.$, page.$$, page.$eval ect.

- Q: What is the default concurrency/parallelism the SDK uses?
- A: AutoscaledPool has option maxConcurrency which is set to 1000 by default.
