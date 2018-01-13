import _ from 'lodash';
import * as sentry from '@sentry/browser';
import parseUrl from 'Utilities/String/parseUrl';

function cleanseUrl(url) {
  const properties = parseUrl(url);

  return `${properties.pathname}${properties.search}`;
}

function cleanseData(data) {
  const result = _.cloneDeep(data);

  result.culprit = cleanseUrl(result.culprit);
  result.request.url = cleanseUrl(result.request.url);

  return result;
}

function identity(stuff) {
  return stuff;
}

function createMiddleware() {
  return (store) => (next) => (action) => {
    try {
      // Adds a breadcrumb for reporting later (if necessary).
      sentry.addBreadcrumb({
        category: 'redux',
        message: action.type
      });

      return next(action);
    } catch (err) {
      console.error(`[sentry] Reporting error to Sentry: ${err}`);

      // Send the report including breadcrumbs.
      sentry.captureException(err, {
        extra: {
          action: identity(action),
          state: identity(store.getState())
        }
      });
    }
  };
}

export default function createSentryMiddleware() {
  const {
    analytics,
    branch,
    version,
    release,
    isProduction
  } = window.Sonarr;

  if (!analytics) {
    return;
  }

  const dsn = isProduction ? 'https://b80ca60625b443c38b242e0d21681eb7@sentry.sonarr.tv/13' :
    'https://8dbaacdfe2ff4caf97dc7945aecf9ace@sentry.sonarr.tv/12';

  sentry.init({
    dsn,
    environment: isProduction ? 'production' : 'development',
    release,
    tags: {
      branch,
      version
    },
    dataCallback: cleanseData
  });

  return createMiddleware();
}
