import {} from '@cloudflare/workers-types';

const CONTENT_TYPES = {
  html: 'text/html;charset=UTF-8',
  json: 'application/json;charset=UTF-8'
};

const DATA_KEY = 'score-data';

const stringToJSON = (obj: Record<string, unknown> | Record<string, unknown>[], pretty?: boolean) =>
  JSON.stringify(obj, null, pretty ? 2 : 0);

const JSONResponse = (
  obj: Record<string, unknown> | Record<string, unknown>[],
  pretty?: boolean
) => {
  return new Response(stringToJSON(obj, pretty), {
    headers: {
      'content-type': CONTENT_TYPES.json
    }
  });
};

const ErrorJSONResponse = (error: string | Error, pretty?: boolean) => {
  return JSONResponse(
    {
      error: typeof error === 'string' ? error : error.message
    },
    pretty
  );
};

function toQueryString(paramsString: string) {
  const searchParams = new URLSearchParams(paramsString);
  return searchParams.toString();
}

function getScoreData(rawHtml: string) {
  const cleanWhitespaces = (s: string) => s.trim().replace(/\s\s+/g, ' ');
  const cleanHtmlTags = (s: string) => s.replace(/<[^>]*>/g, '');

  const rawHtmlArr = rawHtml.split('\n');
  const cleanedRawHtmlArr = rawHtmlArr
    .map((v) => cleanWhitespaces(v))
    .filter((rawHtmlLine) => rawHtmlLine !== '');

  let isTable = false;
  let firstTableFound = false;
  const tableRawHtml = cleanedRawHtmlArr.filter((rawHtmlLine) => {
    if (rawHtmlLine.includes('<table') && !firstTableFound) {
      isTable = true;
      firstTableFound = true;
    }
    if (rawHtmlLine.includes('</table>')) {
      isTable = false;
    }
    return isTable;
  });

  const dataArray = tableRawHtml
    .map((v) => cleanHtmlTags(v))
    .filter((v) => {
      if (v === '') return false;
      if (v === '&nbsp;') return false;
      return true;
    });

  const headRow = dataArray.splice(0, 9);
  const teamCount = dataArray.length / headRow.length;

  const teamData = [];
  for (let i = 0; i < teamCount; i += 1) {
    const entry: { [key: string]: string } = {};
    headRow.forEach((headName, index) => {
      entry[headName] = dataArray[i * teamCount + index];
    });
    teamData.push(entry);
  }
  return { headRow, teamData };
}

function checkDataUpdateStatus(lastUpdate: string | null) {
  if (!lastUpdate) {
    return null;
  }
  const updatedAt = Number(lastUpdate);
  const now = new Date().getTime();

  return now - updatedAt < 3600 * 1000;
}

async function handleRequest(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const forceUpdate = searchParams.get('force');
  const lastUpdate = await KVStore.get(`${DATA_KEY}-updated`);
  const isUpToDate = checkDataUpdateStatus(lastUpdate);

  if (!forceUpdate && isUpToDate) {
    const data = await KVStore.get(DATA_KEY);
    const headRow = await KVStore.get(`${DATA_KEY}-headrow`);
    if (data) {
      const parsedData = JSON.parse(data);
      return JSONResponse({ data: parsedData, headRow, updatedAt: lastUpdate });
    }
  }

  const group = searchParams.get('group') || 261158;
  const championship = searchParams.get('championship') || 'BHV Ost 20/21';

  if (!group || !championship) {
    return ErrorJSONResponse('you need to privide group and championship');
  }

  const baseUrl = 'https://hvmv-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/groupPage';
  const queryString = toQueryString(`championship=${championship}&group=${group}`);
  const url = `${baseUrl}?${queryString}`;

  if (!url) {
    return ErrorJSONResponse('Url not found');
  }
  const rawHtml = await fetch(url).then((res) => res.text());
  const { headRow, teamData } = getScoreData(rawHtml);

  await KVStore.put(DATA_KEY, JSON.stringify(teamData));
  await KVStore.put(`${DATA_KEY}-headrow`, JSON.stringify(headRow));
  const now = new Date().getTime().toString();
  await KVStore.put(`${DATA_KEY}-updated`, now);

  return JSONResponse({ data: teamData, headRow, updatedAt: now });
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
