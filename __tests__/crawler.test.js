const { LinkCrawlerChatroom } = require('../link_crawler.js');

beforeEach(() => {
  document.body.innerHTML = '<div id="links-container"></div>';
  localStorage.clear();
});

test('markLinkOpened stores timestamp and purge removes old entries', () => {
  const crawler = new LinkCrawlerChatroom('tester');
  const url = 'http://example.com';
  const now = Date.now();
  jest.spyOn(Date, 'now').mockReturnValue(now);

  crawler.markLinkOpened(url);
  let opened = crawler.getOpenedLinks();
  expect(opened[url]).toBe(now);

  // simulate 49 hours later, entry should be purged
  Date.now.mockReturnValue(now + 49 * 60 * 60 * 1000);
  opened = crawler.getOpenedLinks();
  expect(opened[url]).toBeUndefined();

  Date.now.mockRestore();
});

test('normalizeTimestamp handles invalid values', () => {
  const crawler = new LinkCrawlerChatroom('tester');
  const ts = crawler.normalizeTimestamp('invalid');
  expect(typeof ts).toBe('number');
});

// Tests for recent changes
describe('DOM manipulation and display logic', () => {
    let crawler;
    let container;
    let originalMaxLinks;

    beforeEach(() => {
        // Set a smaller MAX_DISPLAY_LINKS for easier testing
        originalMaxLinks = LinkCrawlerChatroom.MAX_DISPLAY_LINKS;
        LinkCrawlerChatroom.MAX_DISPLAY_LINKS = 3;
        crawler = new LinkCrawlerChatroom('tester');
        container = document.getElementById('links-container');
    });

    afterEach(() => {
        // Restore the original value
        LinkCrawlerChatroom.MAX_DISPLAY_LINKS = originalMaxLinks;
    });

    test('should add .duplicate-link class to duplicate links', () => {
        const linkData = { content: 'check out http://example.com', sender: { username: 'user1', identity: {} }, created_at: new Date().toISOString() };
        
        crawler.handleMessageAndExtractLinks(linkData);
        crawler.handleMessageAndExtractLinks(linkData); // Send the same link again

        const linkElement = container.querySelector('.link-item');
        expect(linkElement.classList.contains('duplicate-link')).toBe(true);
        const badge = linkElement.querySelector('.link-count-badge');
        expect(badge).not.toBeNull();
        expect(badge.textContent).toBe('2');
    });

    test('should remove the oldest link when MAX_DISPLAY_LINKS is exceeded', () => {
        crawler.displayLink({ url: 'http://link1.com', displayText: 'link1', sender: 'user1', timestamp: Date.now() });
        crawler.displayLink({ url: 'http://link2.com', displayText: 'link2', sender: 'user2', timestamp: Date.now() });
        crawler.displayLink({ url: 'http://link3.com', displayText: 'link3', sender: 'user3', timestamp: Date.now() });
        
        expect(container.children.length).toBe(3);
        
        // This one should push out the first link
        crawler.displayLink({ url: 'http://link4.com', displayText: 'link4', sender: 'user4', timestamp: Date.now() });
        
        expect(container.children.length).toBe(3);
        const links = Array.from(container.querySelectorAll('a')).map(a => a.href);
        expect(links).not.toContain('http://link1.com/');
        expect(links).toContain('http://link4.com/');
    });

    test('displayLink should create a correctly structured element', () => {
        const linkDetails = { url: 'http://test.com', displayText: 'test.com', sender: 'tester', timestamp: Date.now(), message: 'a message' };
        crawler.displayLink(linkDetails);

        const item = container.querySelector('.link-item');
        expect(item).not.toBeNull();
        expect(item.dataset.sender).toBe('tester');
        expect(item.querySelector('.link-timestamp')).not.toBeNull();
        expect(item.querySelector('.message-context').textContent).toBe('a message');
        expect(item.querySelector('.link-sender').textContent).toBe('tester:');
        const anchor = item.querySelector('a');
        expect(anchor).not.toBeNull();
        expect(anchor.href).toBe('http://test.com/');
        expect(anchor.textContent).toBe('test.com');
    });
});

