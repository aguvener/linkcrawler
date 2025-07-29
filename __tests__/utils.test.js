const { isHttpProtocol, debounce, URLParams, dontLeave } = require('../link_crawler.js');

test('isHttpProtocol recognizes http and https URLs', () => {
  expect(isHttpProtocol('http://example.com')).toBe(true);
  expect(isHttpProtocol('https://example.com')).toBe(true);
  expect(isHttpProtocol('ftp://example.com')).toBe(false);
  expect(isHttpProtocol('notaurl')).toBe(true);
});

test('debounce delays function execution', () => {
  jest.useFakeTimers();
  const fn = jest.fn();
  const debounced = debounce(fn, 200);
  debounced('hi');
  jest.advanceTimersByTime(199);
  expect(fn).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledWith('hi');
});

test('URLParams DEFAULT_USERNAME and getParam', () => {
  document.body.dataset.defaultUser = 'bodyUser';
  window.DEFAULT_USERNAME = 'configUser';
  expect(URLParams.DEFAULT_USERNAME).toBe('configUser');

  delete window.DEFAULT_USERNAME;
  expect(URLParams.DEFAULT_USERNAME).toBe('bodyUser');

  delete document.body.dataset.defaultUser;
  expect(URLParams.DEFAULT_USERNAME).toBe('BurakSakinOl');

  const originalHref = window.location.href;
  window.history.pushState({}, '', '?user=tester');
  const params = new URLParams();
  expect(params.getParam('user')).toBe('tester');
  window.history.pushState({}, '', originalHref);
});

test('dontLeave returns message', () => {
  expect(dontLeave()).toMatch(/Please, don\'t leave/);
});
