# VTS Elevators Backend

This backend is built with Node.js, Express, and SQLite.

## Install

Open a terminal in `backend` and run:

```bash
npm install
```

## Run

```bash
npm start
```

The server will start on `http://localhost:4000`.

## API Endpoints

- `GET /api/queries` — list all queries
- `GET /api/queries/:id` — get one query
- `POST /api/queries` — create a query
- `POST /api/google-form` — receive external Google Form submissions
- `PATCH /api/queries/:id` — update status or priority
- `GET /api/stats` — dashboard counts
- `GET /api/units` — available units list

## Google Form / QR integration

To connect a QR-linked Google Form to this app:

1. Create a Google Form with fields such as:
   - Full Name
   - Address / Location Details
   - Mobile Number
   - Unit
   - Building
   - Query Description
   - Priority

2. Open the response sheet, then open `Extensions > Apps Script`.

3. Add this Apps Script and update the URL to your backend endpoint:

```js
function onFormSubmit(e) {
  const data = e.namedValues;
  const payload = {
    name: data['Full Name'][0],
    address: data['Address / Location Details'][0],
    mobile: data['Mobile Number'][0],
    unit: data['Unit'][0],
    building: data['Building'][0],
    description: data['Query Description'][0],
    priority: data['Priority'] ? data['Priority'][0] : 'normal',
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  UrlFetchApp.fetch('http://YOUR_PUBLIC_URL/api/google-form', options);
}
```

4. Save and configure an `On form submit` trigger for `onFormSubmit`.

5. Generate a QR code from your Google Form URL and place it wherever users can scan.

6. Make sure the backend is reachable from the internet. For local testing, use a tunnel service such as `ngrok` or `localtunnel` and point the Apps Script URL there.

## Configure the frontend Google Form link

In `frontend/app.js`, update the placeholder URL with your real Google Form link:

```js
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform';
```

If that value is not replaced, the app will show an error toast instead of opening the form.

## Public backend access

Google Apps Script must be able to reach your backend at a public address. For local development, use a tunnel such as `ngrok` or `localtunnel` and update the Apps Script URL to point to that public endpoint:

```js
UrlFetchApp.fetch('https://YOUR_PUBLIC_TUNNEL_URL/api/google-form', options);
```

### QR-only workflow (no frontend on device)

If your end-users only scan a QR which opens a Google Form (and they don't use this web app locally), you can still ingest those submissions into this backend. Key points:

- In your Google Form make sure you collect at least **Query Description**. Optionally collect Name and Mobile.
- Encode the unit identifier in the QR payload (for example the QR can contain a URL with a query parameter like `?unitId=VTS-9921-X`).
- In the Apps Script, include the `unitId` from the form URL or add a hidden form field populated via the QR link.

Example Apps Script that reads namedValues and also pulls `unitId` from the form's response URL (if you added it as a hidden field):

```js
function onFormSubmit(e) {
  const data = e.namedValues;
  // If you used a hidden field named "Unit ID" in the form, read it here:
  const payload = {
    name: data['Full Name'] ? data['Full Name'][0] : 'Anonymous',
    address: data['Address / Location Details'] ? data['Address / Location Details'][0] : '',
    mobile: data['Mobile Number'] ? data['Mobile Number'][0] : '',
    unitId: data['Unit ID'] ? data['Unit ID'][0] : '',
    building: data['Building'] ? data['Building'][0] : 'Submitted via Google Form',
    description: data['Query Description'] ? data['Query Description'][0] : '',
    priority: data['Priority'] ? data['Priority'][0] : 'normal',
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  UrlFetchApp.fetch('https://YOUR_PUBLIC_TUNNEL_URL/api/google-form', options);
}
```

This backend accepts `unitId` and will map it to a friendly unit name when possible. The minimal required fields sent to `/api/google-form` are `unit` (or `unitId`) and `description`.

## Connect frontend

Use the server URL from the frontend code, for example `http://localhost:4000/api/queries`.
