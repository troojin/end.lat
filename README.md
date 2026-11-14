# end.lat

hi fun linkshortner i made

## Features

- url uses end.lat/[keyword or id]
- custom keywords for links
- fast & minimal, no sign up needed
- public API for third-party apps, game rooms, & parties
- yeah um this link shortner isnt really special😭

## API Documentation

The `end.lat` API is completely open with CORS enabled for all origins.

### Endpoint

```http
GET https://end.lat/api?url={URL}&keyword={KEYWORD}
```

### Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | string | **Required**. The destination http(s) URL. |
| `keyword` | string | **Optional**. Custom alias / slug (`[a-zA-Z0-9_-]`). |
| `redirect` | boolean | **Optional**. If `true`, 302 redirects straight to the short link. |

### Party / Room Sharing Example

Generate a room or party link from your web app or game to share around:

```javascript
const roomUrl = "https://mygame.io/rooms/party-9821";
const res = await fetch(`https://end.lat/api?url=${encodeURIComponent(roomUrl)}&keyword=squad-party`);
const data = await res.json();

console.log(data.short);
// https://end.lat/squad-party
```

### Response

```json
{
  "short": "https://end.lat/squad-party",
  "id": "squad-party",
  "url": "https://mygame.io/rooms/party-9821"
}
```
