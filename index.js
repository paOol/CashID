// const BCHNode = require("bitcoin-cash-rpc");
// const bch = new BCHNode(host, username, password, port, 3000);

const statusCodes = {
  successful: 0,
  malformedResponse: 1,
  malformedRequest: 2,
  malformedAddress: 3,
  malformedSignature: 4,
  malformedMetadata: 5,
  nonceInvalid: 6,
  nonceExpired: 7,
  nonceConsumed: 8,
  invalidSignature: 9,
  addressDenied: 10,
  addressRevoked: 11,
  metadataMissing: 12,
  metadataInvalid: 13,
  actionNotImplemented: 14,
  actionUnavailable: 15,
  actionDenied: 16,
  invalidMethod: 89,
  invalidScheme: 90,
  invalidDomain: 91,
  missingRequest: 95,
  missingAddress: 96,
  missingSignature: 96,
  missingNonce: 97,
  requestModified: 98,
  internalError: 99
};
const userActions = ["delete", "logout", "revoke", "update"];

const metadataNames = {
  identity: {
    name: 1,
    family: 2,
    nickname: 3,
    age: 4,
    gender: 5,
    birthdate: 6,
    picture: 8,
    national: 9
  },
  position: {
    country: 1,
    state: 2,
    city: 3,
    streetname: 4,
    streetnumber: 5,
    residence: 6,
    coordinates: 9
  },
  contact: {
    email: 1,
    instant: 2,
    social: 3,
    phone: 4,
    postal: 5
  }
};
const regexps = {
  request: /(cashid:)(?:[\/]{2})?([^\/]+)(\/[^\?]+)(\?.+)/,
  parameters: /(?:(?:[\?\&]{1}a=)([^\&]+))?(?:(?:[\?\&]{1}d=)([^\&]+))?(?:(?:[\?\&]{1}r=)([^\&]+))?(?:(?:[\?\&]{1}o=))?([^\&]+)?(?:[\?\&]{1}x=)([^\&]+)?/,
  metadata: /(?:i((?![1-9]+))?(1)?(2)?(3)?(4)?(5)?(6)?(8)?(9)?)?(?:p((?![1-9]+))?(1)?(2)?(3)?(4)?(6)?(9)?)?(?:c((?![1-9]+))?(1)?(2)?(3)?(4)?(7)?)?/
};
class CashID {
  createRequest(action, data, metadata) {
    // generate a random nonce.
    let nonce = this.getRandom(100000000, 999999999);
    console.log("random", nonce);

    console.log("action", action);

    // Initialize an empty parameter list.
    let parameters;

    // If a specific action was requested, add it to the parameter list.
    if (action !== undefined) {
      parameters["a"] = `a=${action}`;
    }

    // If specific data was requested, add it to the parameter list.
    if (data !== undefined) {
      parameters["d"] = `d=${data}`;
    }

    // If required metadata was requested, add them to the parameter list.
    if (metadata["required"]) {
      parameters["r"] = `r=${this.encodeRequestMetadata(metadata["required"])}`;
    }

    // If optional metadata was requested, add them to the parameter list.
    if (metadata["optional"]) {
      parameters["o"] = `o=${this.encodeRequestMetadata(metadata["optional"])}`;
    }

    // Append the nonce to the parameter list.
    parameters["x"] = `x=${nonce}`;

    // Form the request URI from the configured values.
    let requestUri = `cashid:${serviceDomain}${servicePath}?${parameters.join(
      "&"
    )}`;

    // Return the request URI to indicate success.
    return requestUri;
  }

  encodeRequestMetadata(metadata) {
    // Initialize an empty metadata string.
    metadataString = "";

    // Iterate over the available metadata names.
    for (const ticker of tickers) {
      for (const metadataName of metadataNames) {
        // Store the first letter of the metadata type.
        metadataLetter = substr(metadataName, 0, 1);

        // Initialize an empty metadata part string.
        metadataPart = "";

        //
        if (metadata[metadataName].length) {
          // Iterate over each field of this metadata type.
          for (const metadataField of metadataFields) {
            // If this field was requested..
            if (metadata[metadataName].indexOf(field_name)) {
              // .. add it to the metadata part.
              metadataPart += fieldCode;
            }
          }

          // If, after checking for requested metadata of this type, some matches were found..
          if (metadataPart !== "") {
            // Add the letter and numbers matching the requested metadata to the metadata string.
            metadataString += `${metadataLetter}${metadataPart}`;
          }
        }
      }
    }
    // Return the filled in metadata string.
    return metadataString;
  }
  parseRequest(requestUri) {
    console.log("requestUri", requestUri);
    // Initialize empty structure

    let parsed = this.parseCashIDRequest(requestUri);

    // remove undefined keys
    let formatted = JSON.parse(JSON.stringify(parsed));
    console.log("formatted", formatted);

    return formatted;
  }

  getRandom(min, max) {
    return Math.floor(Math.random() * (1 + max - min)) + min;
  }

  clean(obj) {
    Object.keys(obj).forEach(key => obj[key] == null && delete obj[key]);
  }

  parseCashIDRequest(requestURI) {
    let regnames = {
      request: {
        scheme: 1,
        domain: 2,
        path: 3,
        parameters: 4
      },
      parameters: {
        action: 1,
        data: 2,
        required: 3,
        optional: 4,
        nonce: 5
      },
      metadata: {
        identification: 1,
        name: 2,
        family: 3,
        nickname: 4,
        age: 5,
        gender: 6,
        birthdate: 7,
        picture: 8,
        national: 9,
        position: 10,
        country: 11,
        state: 12,
        city: 13,
        street: 14,
        residence: 15,
        coordinate: 16,
        contact: 17,
        email: 18,
        instant: 19,
        social: 20,
        phone: 21,
        postal: 22
      }
    };

    let requestParts = regexps.request.exec(requestURI);
    let requestParameters = regexps.parameters.exec(
      requestParts[regnames["request"]["parameters"]]
    );
    let requestRequired = regexps.metadata.exec(
      requestParameters[regnames["parameters"]["required"]]
    );
    let requestOptional = regexps.metadata.exec(
      requestParameters[regnames["parameters"]["optional"]]
    );

    let requestNamedParts = {};
    for (let name in regnames["request"]) {
      requestNamedParts[name] = requestParts[regnames["request"][name]];
    }

    requestNamedParts.parameters = {};
    for (let name in regnames["parameters"]) {
      requestNamedParts.parameters[name] =
        requestParameters[regnames["parameters"][name]];
    }

    if (requestNamedParts.parameters["required"]) {
      requestNamedParts.parameters.required = {};
      for (let name in regnames["metadata"]) {
        requestNamedParts.parameters.required[name] =
          requestRequired[regnames["metadata"][name]];
      }
    }

    if (requestNamedParts.parameters["optional"]) {
      requestNamedParts.parameters.optional = {};
      for (let name in regnames["metadata"]) {
        requestNamedParts.parameters.optional[name] =
          requestOptional[regnames["metadata"][name]];
      }
    }

    return requestNamedParts;
  }
}

module.exports = CashID;
