# Javascript implementation of CashID by Jonathan Silverblood

## Quick Pitch

This is a convenient way to login and sign up to websites using Bitcoin Cash as your "identity".

## Description

CashID is an open protocol that allows secure authentication based on the public key cryptography infrastructure that is currently present in the Bitcoin Cash ecosystem. Each user can prove to a service provider that they control a specific Bitcoin Cash address by signing a challenge request, as well as provide optional metadata.

## Installation

grab from NPM

```
  npm i cashid
```

## Usage

```
import CashID from 'cashid'; // or const CashID = require('cashid');

let cashid = new CashID(domain, path);
// domain = example.com (no http prefix)
// path = /api/auth  (endpoint that will receive POST json data)
let uri = cashid.createRequest(action, data, metadata);

// action is an optional string, ie: 'login'
// data is an optional string, ie: 'newsletter' or '123-123-123'
// metadata is an optional object, ie:
//  {
//      required: {
//        identity: ['name', 'family'],
//        position: ['country'],
//        contact: ['email']
//      },
//      optional: {
//        identity: ['age', 'gender'],
//        position: ['city']
//      }
//  }

return uri;

// uri will look like

// cashid:example.com/api/auth?a=register&d=newsletter&r=i12p1c1&o=i45p3&x=142341090
```

with the uri, you can generate a QR code for the user to scan, or see a client side [badger-wallet implementation](https://github.com/paOol/react-cashid)

The identity manager would read the cashid uri, and send a JSON POST request to the endpoint.

You would validate the object on the server side and return true as the response if valid.

## Available Methods

`cashid.validateRequest(responseObject)`
`cashid.confirmRequest(req,res)` // WIP
`cashid.parseCashIDRequest(requestURI)`
`cashid.createRequest(action, data, metadata)`

### Resources

[CashID spec](https://gitlab.com/cashid/protocol-specification)

[CashID demo](https://demo.cashid.info/)
