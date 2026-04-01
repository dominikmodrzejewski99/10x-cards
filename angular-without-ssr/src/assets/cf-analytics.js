if (
  window.RUNTIME_CONFIG &&
  window.RUNTIME_CONFIG.cfAnalyticsToken &&
  document.cookie.match(/(?:^|;\s*)cookie_consent=accepted/)
) {
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = '{"token":"' + window.RUNTIME_CONFIG.cfAnalyticsToken + '"}';
  document.body.appendChild(s);
}
