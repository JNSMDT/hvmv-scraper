// import Scraper from './scraper.js';

const contentTypes = {
  html: 'text/html;charset=UTF-8',
  json: 'application/json;charset=UTF-8'
};

const stringToJSON = (obj, pretty) => JSON.stringify(obj, null, pretty ? 2 : 0);

const JSONResponse = (obj, pretty) => {
  return new Response(stringToJSON(obj, pretty), {
    headers: {
      'content-type': contentTypes.json,
      'Access-Control-Allow-Origin': '*'
    }
  });
};

const ErrorJSONResponse = (error, pretty) => {
  return JSONResponse(
    {
      error: typeof error === 'string' ? error : error.message
    },
    pretty
  );
};

function toQueryString(paramsString) {
  const searchParams = new URLSearchParams(paramsString);
  return searchParams.toString();
}

async function handleRequest(request) {
  const searchParams = new URL(request.url).searchParams;
  const group = searchParams.get('group');
  const championship = searchParams.get('championship');

  if (!group || !championship) {
    return ErrorJSONResponse('you need to privide group and championship');
  }

  const baseUrl = 'https://hvmv-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/groupPage';
  const queryString = toQueryString(`championship=${championship}&group=${group}`);
  const url = `${baseUrl}?${queryString}`;
  console.log(url);
  if (!url) {
    return ErrorJSONResponse('Url not found');
  }

  const hvmvHTMLString = await fetch(url).then((res) => res.text());

  return JSONResponse({ data: hvmvHTMLString });
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
