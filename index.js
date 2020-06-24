const bitboxSDK = require('bitbox-sdk').BITBOX;
const BITBOX = new bitboxSDK();

const statusCodes = {
  authenticationSuccessful: 0,
  requestBroken: 100,
  requestMissingScheme: 111,
  requestMissingDomain: 112,
  requestMissingNonce: 113,
  requestMalformedScheme: 121,
  requestMalformedDomain: 122,
  requestInvalidDomain: 131,
  requestInvalidNonce: 132,
  requestAltered: 141,
  requestExpired: 142,
  requestConsumed: 143,
  responseBroken: 200,
  responseMissingRequest: 211,
  responseMissingAddress: 212,
  responseMissingSignature: 213,
  responseMissingMetadata: 214,
  responseMalformedAddress: 221,
  responseMalformedSignature: 222,
  responseMalformedMetadata: 223,
  responseInvalidMethod: 231,
  responseInvalidAddress: 232,
  responseInvalidSignature: 233,
  responseInvalidMetadata: 234,
  serviceBroken: 300,
  serviceAddressDenied: 311,
  serviceAddressRevoked: 312,
  serviceActionDenied: 321,
  serviceActionUnavailable: 322,
  serviceActionNotImplemented: 323,
  serviceInternalError: 331
};
const userActions = ['delete', 'logout', 'revoke', 'update'];

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
  /**
   * constructor
   *
   * @param {String} domain - dont include http/https in front
   * @param {String} path - api endpoint ie "/api/test"
   */

  constructor(domain, path) {
    this.domain = domain || 'auth.cashid.org';
    this.path = path || '/api/auth';

    this.statusConfirmation;
  }

  /**
   * creates a request
   *
   * @param {String} action - Name of the action the user authenticates to perform
   * @param {String} data - Data relevant to the requested action
   * @param {String} metadata - Various parameters
   * @returns {string} returns uri
   * ie: cashid:something.com/api/test?x=123
   */

  createRequest(action, data, metadata) {
    // generate a random nonce.
    let nonce = this.getRandom(100000000, 999999999);

    // Initialize an empty parameter list.
    let parameters = {};

    // If a specific action was requested, add it to the parameter list.
    if (action !== undefined) {
      parameters['a'] = `a=${action}`;
    }

    // If specific data was requested, add it to the parameter list.
    if (data !== undefined) {
      parameters['d'] = `d=${data}`;
    }

    // If required metadata was requested, add them to the parameter list.
    if (metadata !== undefined && metadata['required']) {
      parameters['r'] = `r=${this.encodeRequestMetadata(metadata['required'])}`;
    }

    // If optional metadata was requested, add them to the parameter list.
    if (metadata !== undefined && metadata['optional']) {
      parameters['o'] = `o=${this.encodeRequestMetadata(metadata['optional'])}`;
    }

    // Append the nonce to the parameter list.
    parameters['x'] = `x=${nonce}`;

    let params = this.concatKeys(parameters);

    // Form the request URI from the configured values.
    let requestUri = `cashid:${this.domain}${this.path}?${params}`;

    // Return the request URI to indicate success.
    return requestUri;
  }

  concatKeys(obj) {
    let final;
    Object.keys(obj).map(key => {
      final += `&${obj[key]}`;
    });

    final = final.replace('undefined', '');
    final = final.substring(1);
    return final;
  }

  /**
   * encodes metadata
   *
   * @param {String} metadata - Various parameters
   * @returns {string}
   */

  encodeRequestMetadata(metadata) {
    // Initialize an empty metadata string.
    let metadataString = '';

    //Iterate over the available metadata names.
    for (const metadataName in metadataNames) {
      // Store the first letter of the metadata type.
      let metadataLetter = metadataName.substring(0, 1);

      // Initialize an empty metadata part string.
      let metadataPart = '';

      if (
        metadata[metadataName] !== undefined &&
        metadata[metadataName].length
      ) {
        // Iterate over each field of this metadata type.
        for (const metadataField of metadata[metadataName]) {
          let dataNameValue = metadataNames[metadataName][metadataField];
          dataNameValue = dataNameValue.toString();

          // If this field was requested..
          if (metadata[metadataName].includes(metadataField)) {
            // .. add it to the metadata part.
            metadataPart += `${dataNameValue}`;
          }
        }

        // If, after checking for requested metadata of this type, some matches were found..
        if (metadataPart !== '') {
          // Add the letter and numbers matching the requested metadata to the metadata string.
          metadataString += `${metadataLetter}${metadataPart}`;
        }
      }
    }

    // Return the filled in metadata string.
    return metadataString;
  }

  getRandom(min, max) {
    return Math.floor(Math.random() * (1 + max - min)) + min;
  }

  /**
   * validates a request
   *
   * @param {Object} response - example looks like
   *
   *  let responseObject = {
   *    request:
   *      'cashid:demo.cashid.info/api/parse.php?a=login&d=15366-4133-6141-9638&o=i3&x=557579911',
   *    address: 'qpaf03cxjstfc42we3480f4vtznw4356jsn27r5cs3',
   *    signature:'H3hCOFaVnzCz5SyN+Rm9NO+wsLtW4G9S8kLu9Xf8bjoJC3eR9sMdWqS+BJMW5/6yMJBrS+hkNDd41bYPuP3eLY0=',
   *    metadata: []
   *  };
   * @returns {Object} returns parsed request
   */
  validateRequest(responseObject) {
    try {
      this.statusConfirmation = {
        status: `${statusCodes['authenticationSuccessful']}`,
        message: ''
      };

      let message;
      let code = parseInt(this.statusConfirmation.status);

      if (responseObject === null) {
        throw new Error(
          `Response data is not a valid JSON object. statuscode:${
            statusCodes['responseBroken']
          }`
        );
      }

      // Validate if the required field 'request' exists.
      if (responseObject['request'] === undefined) {
        throw new Error(
          "Response data is missing required 'request' property.",
          statusCodes['responseMissingRequest']
        );
      }

      // Validate if the required field 'address' exists.
      if (responseObject['address'] === undefined) {
        throw new Error(
          `Response data is missing required 'adress' property.", statuscode:${
            statusCodes['responseMissingAddress']
          }`
        );
      }

      // Validate if the required field 'signature' exists.
      if (responseObject['signature'] === undefined) {
        throw new Error(
          `Response data is missing required 'signature' property.", statuscode:${
            statusCodes['responseMissingSignature']
          }`
        );
      }

      // Parse the request.
      let parsedRequest = this.parseCashIDRequest(responseObject['request']);

      // Validate overall structure.
      if (parsedRequest === false) {
        throw new Error(
          `Internal server error, could not evaluate request structure statuscode:${
            statusCodes['serviceInternalError']
          }`
        );
      } else if (parsedRequest == 0) {
        throw new Error(
          `Request URI is invalid, ${statusCodes['requestBroken']}`
        );
      }

      // Validate the request scheme.
      if (parsedRequest['scheme'] != 'cashid:') {
        throw new Error(
          `Request scheme ${
            parsedRequest['scheme']
          } is invalid, should be 'cashid:'.", statuscode:${
            statusCodes['requestMalformedScheme']
          }`
        );
      }

      // Validate the request domain.
      if (parsedRequest['domain'] != this.domain) {
        throw new Error(
          `Request domain  ${
            parsedRequest['domain']
          } is invalid, this service uses ${this.domain}, statuscode:${
            statusCodes['requestInvalidDomain']
          }`
        );
      }

      // Validate the parameter structure
      if (parsedRequest['parameters'] === false) {
        throw new Error(
          `Internal server error, could not evaluate request parameters.", statuscode:${
            statusCodes['serviceInternalError']
          }`
        );
      } else if (parsedRequest['parameters'] == 0) {
        throw new Error(
          `Request parameters are invalid.", ${statusCodes['requestBroken']}`
        );
      }

      // Validate the existance of a nonce.
      if (parsedRequest['parameters']['nonce'] === undefined) {
        throw new Error(
          `Request parameter 'nonce' is missing.", statuscode:${
            statusCodes['requestMissingNonce']
          }`
        );
      }

      // // Locally store if the request action is a user-initiated action.
      let userInitiatedRequest =
        userActions[parsedRequest['parameters']['action']] !== undefined;

      // Locally store values to compare with nonce timestamp to validate recency.
      // NOTE: current time is set to 1 minute in the future to allow for minor clock drift.
      // let recent_time = time() - 60 * 60 * 15;
      // let current_time = time() + 60 * 1 * 1;

      // // Validate if a user initiated request is a recent and valid timestamp...
      // if(userInitiatedRequest and ((parsedRequest['parameters']['nonce'] < recent_time) or (parsedRequest['parameters']['nonce'] > current_time)))
      // {
      //   throw new Error(`Request nonce for user initated action is not a valid and recent timestamp.", ${statusCodes['requestInvalidNonce']}`);
      // }

      // Try to load the request from the apcu object cache.
      let requestReference;
      // let requestReference = apcu_fetch(
      //   "cashid_request_{parsedRequest['parameters']['nonce']}"
      // );

      // Validate that the request was issued by this service provider.
      if (!userInitiatedRequest && requestReference === false) {
        throw new Error(
          `The request nonce was not issued by this service.", statuscode:${
            statusCodes['requestInvalidNonce']
          }`
        );
      }

      // Validate if the request is available
      if (
        !userInitiatedRequest &&
        requestReference !== undefined &&
        requestReference['available'] === false
      ) {
        throw new Error(
          `The request nonce was not issued by this service.", statuscode:${
            statusCodes['nonceConsumed']
          }`
        );
      }

      // Validate if the request has expired.
      if (
        !userInitiatedRequest &&
        requestReference !== undefined &&
        requestReference['expires'] < time()
      ) {
        throw new Error(
          `The request has expired && is no longer available.", statuscode:${
            statusCodes['requestExpired']
          }`
        );
      }

      // Validate that the request has not been tampered with.
      if (
        !userInitiatedRequest &&
        requestReference !== undefined &&
        requestReference['request'] != responseObject['request']
      ) {
        throw new Error(
          `The response does not match the request parameters.", statuscode:${
            statusCodes['requestAltered']
          }`
        );
      }

      // signature verification.

      let verificationStatus = BITBOX.BitcoinCash.verifyMessage(
        responseObject['address'],
        responseObject['signature'],
        responseObject['request']
      );

      // Validate the signature.
      if (verificationStatus !== true) {
        throw new Error(
          `Signature verification failed. statuscode:${
            statusCodes['responseInvalidSignature']
          }`
        );
      }

      // Initialize an empty list of missing metadata.
      let missingFields = [];

      // Loop over the required metadata fields.
      for (const metadataName in parsedRequest['parameters']['required']) {
        // If the field was required && missing from the response..
        if (
          metadataValue &&
          responseObject['metadata'][metadataName] === undefined
        ) {
          // Store it in the list of missing fields.
          missingFields[metadataName] = metadataName;
        }
      }

      // Validate if there was missing metadata.
      if (missingFields.length >= 1) {
        throw new Error(
          `The required metadata field(s) '" . implode(', ', missingFields) . "' was not provided.", statuscode:${
            statusCodes['responseMissingMetadata']
          }`
        );
      }

      // Loop over the supplied metadata fields.
      if (
        responseObject['metadata'] !== undefined &&
        responseObject['metadata'].length
      ) {
        for (const metadataValue of responseObject['metadata']) {
          // Validate if the supplied metadata was requested
          if (
            parsedRequest['parameters']['required'][metadataName] ===
              'undefined' &&
            parsedRequest['parameters']['optional'][metadataName] === undefined
          ) {
            throw new Error(
              `The metadata field '${metadataName}' was not part of the request.", ${
                statusCodes['responseInvalidMetadata']
              }`
            );
          }

          // Validate if the supplied value is empty.
          if (metadataValue == '' || metadataValue === null) {
            throw new Error(
              `The metadata field '${metadataName}' did not contain any value.", ${
                statusCodes['responseMalformedMetadata']
              }`
            );
          }
        }
      }

      // // Store the response object in local cache.
      // if (
      //   !apcu_store(
      //     "cashid_response_{parsedRequest['parameters']['nonce']}",
      //     responseObject
      //   )
      // ) {
      //   throw new Error(
      //     `Internal server error, could not store response object.", statusCodes['serviceInternalError']`
      //   );
      // }

      // // Store the confirmation object in local cache.
      // if (
      //   !apcu_store(
      //     "cashid_confirmation_{parsedRequest['parameters']['nonce']}",
      //     this.statusConfirmation
      //   )
      // ) {
      //   throw new Error(
      //     `Internal server error, could not store confirmation object.", statusCodes['serviceInternalError']`
      //   );
      // }

      // Add status message

      Object.entries(statusCodes).forEach(x => {
        let key = x[0];
        let val = x[1];

        if (val === code) {
          message = key;
        }
      });
      this.statusConfirmation.message = message;

      // Add the action && data parameters to the response structure.
      responseObject['action'] =
        parsedRequest['parameters']['action'] !== undefined
          ? parsedRequest['parameters']['action']
          : 'auth';
      responseObject['data'] =
        parsedRequest['parameters']['data'] !== undefined
          ? parsedRequest['parameters']['data']
          : '';

      responseObject['nonce'] =
        parsedRequest['parameters']['nonce'] !== undefined
          ? parsedRequest['parameters']['nonce']
          : '';

      // Return the parsed response.
      return responseObject;
    } catch (e) {
      console.log('err with validation', e.message);
      return e.message;
      //return false;
    }
  }

  /**
   * confirms request
   *
   *
   * @returns {string} status code
   */
  confirmRequest(headers) {
    // Sanity check if validation has not yet been done.
    if (this.statusConfirmation.status === undefined) {
      throw new Error(
        'confirmRequest() was called before validateRequest so there is no confirmation to transmit to the client.'
      );
    }

    Object.values(statusCodes);
    //     let  result = statusCodes.find(obj => {
    //   return obj.b === this.statusConfirmation.status
    // })

    if (headers['content-type'] !== 'application/json') {
      throw new Error('wrong header type was sent.');
    }

    // send the response confirmation back to the identity manager.
    return this.statusConfirmation;
  }

  /**
   * parse request
   *
   * @param {String} requestURI -ie cashid:domain.com/path
   * @returns {Object} formatted to show the parameters
   */

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
      requestParts[regnames['request']['parameters']]
    );
    let requestRequired = regexps.metadata.exec(
      requestParameters[regnames['parameters']['required']]
    );
    let requestOptional = regexps.metadata.exec(
      requestParameters[regnames['parameters']['optional']]
    );

    let requestNamedParts = {};
    for (let name in regnames['request']) {
      requestNamedParts[name] = requestParts[regnames['request'][name]];
    }

    requestNamedParts.parameters = {};
    for (let name in regnames['parameters']) {
      requestNamedParts.parameters[name] =
        requestParameters[regnames['parameters'][name]];
    }

    if (requestNamedParts.parameters['required']) {
      requestNamedParts.parameters.required = {};
      for (let name in regnames['metadata']) {
        requestNamedParts.parameters.required[name] =
          requestRequired[regnames['metadata'][name]];
      }
    }

    if (requestNamedParts.parameters['optional']) {
      requestNamedParts.parameters.optional = {};
      for (let name in regnames['metadata']) {
        requestNamedParts.parameters.optional[name] =
          requestOptional[regnames['metadata'][name]];
      }
    }

    // remove undefined keys
    let formatted = JSON.parse(JSON.stringify(requestNamedParts));
    return formatted;
  }
}

module.exports = CashID;
