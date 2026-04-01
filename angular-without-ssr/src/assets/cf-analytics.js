if (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.cfAnalyticsToken) {
  var match = document.cookie.match(/(?:^|;\s*)cookie_consent=([^;]*)/);
  var val = match && match[1] ? decodeURIComponent(match[1]) : '';
  var ok = val === 'accepted' || (val.indexOf('"analytics"') !== -1 && val.indexOf('true') !== -1);
  if (ok) {
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.dataset.cfBeacon = '{"token":"' + window.RUNTIME_CONFIG.cfAnalyticsToken + '"}';
    document.body.appendChild(s);
  }
}
