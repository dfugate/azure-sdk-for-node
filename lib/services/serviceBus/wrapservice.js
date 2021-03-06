﻿/**
* Copyright 2011 Microsoft Corporation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

// Module dependencies.
var util = require('util');

var azureutil = require('../../util/util');

var ServiceClient = require('../serviceclient');

var WebResource = require('../../http/webresource');
var Constants = require('../../util/constants');
var QueryStringConstants = Constants.QueryStringConstants;
var HttpConstants = Constants.HttpConstants;
var HeaderConstants = Constants.HeaderConstants;

var AcsTokenResult = require('./models/acstokenresult');

// Expose 'Wrap'.
exports = module.exports = WrapService;

/**
* Creates a new Wrap object.
*
* @param {string} acsnamespace            The access control namespace.
* @param {string} issuer                  The service bus issuer.
* @param {string} accessKey               The service bus issuer password.
* @param {string} host                    The host for the service.
*/
function WrapService(acsnamespace, issuer, accessKey, host) {
  if (!host) {
    host = ServiceClient.CLOUD_ACCESS_CONTROL_HOST;
  }

  this.acsnamespace = acsnamespace;
  if (!this.acsnamespace) {
    this.acsnamespace = process.env[ServiceClient.EnvironmentVariables.AZURE_WRAP_NAMESPACE];

    if (!this.acsnamespace) {
      this.acsnamespace = process.env[ServiceClient.EnvironmentVariables.AZURE_SERVICEBUS_NAMESPACE] + ServiceClient.DEFAULT_WRAP_NAMESPACE_SUFFIX;
    }
  }

  this.issuer = issuer;
  if (!this.issuer) {
    this.issuer = process.env[ServiceClient.EnvironmentVariables.AZURE_SERVICEBUS_ISSUER];

    if (!this.issuer) {
      this.issuer = ServiceClient.DEFAULT_SERVICEBUS_ISSUER;
    }
  }

  this.accessKey = accessKey;
  if (!this.accessKey) {
    this.accessKey = process.env[ServiceClient.EnvironmentVariables.AZURE_SERVICEBUS_ACCESS_KEY];
  }

  WrapService.super_.call(this, host);

  this.protocol = 'https://';
  this.port = 443;
}

util.inherits(WrapService, ServiceClient);

WrapService.prototype.wrapAccessToken = function (uri, optionsOrCallback, callback) {
  var options = null;
  if (typeof optionsOrCallback === 'function' && !callback) {
    callback = optionsOrCallback;
  } else {
    options = optionsOrCallback;
  }

  validateCallback(callback);

  var acsData = 'wrap_name=' + encodeURIComponent(this.issuer) +
                '&wrap_password=' + encodeURIComponent(this.accessKey) +
                '&wrap_scope=' + encodeURIComponent(uri);

  var webResource = WebResource.post('WRAPv0.9/')
    .withOkCode(HttpConstants.HttpResponseCodes.OK_CODE)
    .withRawResponse(true);

  webResource.addOptionalHeader(HeaderConstants.CONTENT_TYPE, 'application/x-www-form-urlencoded');

  var processResponseCallback = function (responseObject, next) {
    responseObject.acsTokenResult = null;
    if (!responseObject.error) {
      responseObject.acsTokenResult = AcsTokenResult.parse(responseObject.response.body);
    }

    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.acsTokenResult, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, acsData, options, processResponseCallback);
};

WrapService.prototype._buildRequestOptions = function (webResource, options, callback) {
  var self = this;

  if (!webResource.headers || !webResource.headers[HeaderConstants.CONTENT_TYPE]) {
    webResource.addOptionalHeader(HeaderConstants.CONTENT_TYPE, '');
  }

  // Sets the request url in the web resource.
  this._setRequestUrl(webResource);

  var requestOptions = {
    method: webResource.httpVerb,
    path: webResource.requestUrl,
    host: self.getRequestHost(),
    port: self.getRequestPort(),
    headers: webResource.headers
  };

  callback(null, requestOptions);
};

/**
* Retrieves the normalized path to be used in a request.
* It adds a leading "/" to the path in case
* it's not there before.
*
* @param {string} path The path to be normalized.
* @return {string} The normalized path.
*/
WrapService.prototype.getPath = function (path) {
  if (path === null || path === undefined) {
    path = '/';
  } else if (path.indexOf('/') !== 0) {
    path = '/' + path;
  }

  return path;
};

/**
* Retrives the hostname.
*
* @return {string} The hostname.
*/
WrapService.prototype.getHostname = function () {
  return this.acsnamespace + '.' + this.host;
};

/**
* Validates a callback function.
*
* @param (function) callback The callback function.
* @return {Void}
*/
function validateCallback(callback) {
  if (!callback) {
    throw new Error('Callback must be specified.');
  }
}