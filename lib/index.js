'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bluebird = require('bluebird');

var Promise = _interopRequireWildcard(_bluebird);

var _superagentBluebirdPromise = require('superagent-bluebird-promise');

var superagent = _interopRequireWildcard(_superagentBluebirdPromise);

var _url = require('url');

var url = _interopRequireWildcard(_url);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Confluency = function () {
  function Confluency(_ref) {
    var host = _ref.host,
        _ref$context = _ref.context,
        context = _ref$context === undefined ? '' : _ref$context,
        username = _ref.username,
        password = _ref.password;

    _classCallCheck(this, Confluency);

    this.host = host;
    if (context.length && context[0] !== '/') context = '/' + context;
    this.context = context;
    this.username = username;
    this.password = password;
    this.client = superagent.agent();
  }

  _createClass(Confluency, [{
    key: 'getBasicAuth',
    value: function getBasicAuth() {
      var tok = this.username + ':' + this.password;
      var hash = new Buffer(tok, 'binary').toString('base64');
      return 'Basic ' + hash;
    }
  }, {
    key: 'compositeUri',
    value: function compositeUri(_ref2) {
      var prefix = _ref2.prefix,
          uri = _ref2.uri;

      return this.host + this.context + prefix + uri;
    }
  }, {
    key: 'auth',
    value: function auth(request) {
      if (this.username && this.password) {
        request.set('Authorization', this.getBasicAuth());
      }
      return request;
    }
  }, {
    key: 'GET',
    value: function GET(uri) {
      var prefix = '/rest/api';
      if (uri.slice(0, prefix.length) === prefix) {
        prefix = '';
      }
      var request = this.client.get(this.compositeUri({ prefix: prefix, uri: uri }));
      this.auth(request);
      return request.then(function (data) {
        return data.body;
      });
    }
  }, {
    key: 'POST',
    value: function POST(uri, body) {
      var prefix = '/rest/api';
      var request = this.client.post(this.compositeUri({ prefix: prefix, uri: uri }));
      this.auth(request);
      request.set('Content-Type', 'application/json');
      return request.send(body).then(function (data) {
        return data.body;
      });
    }
  }, {
    key: 'PUT',
    value: function PUT(uri, body) {
      var prefix = '/rest/api';
      var request = this.client.put(this.compositeUri({ prefix: prefix, uri: uri }));
      this.auth(request);
      request.set('Content-Type', 'application/json');
      return request.send(body).then(function (data) {
        return data.body;
      }).catch(function (e) {
        return console.error(e);
      });
    }
  }, {
    key: 'DEL',
    value: function DEL(uri) {
      var prefix = '/rest/api';
      var request = this.client.del(this.compositeUri({ prefix: prefix, uri: uri }));
      this.auth(request);
      return request.then(function (data) {
        return data.body;
      });
    }
  }, {
    key: 'createQueryString',
    value: function createQueryString(parameters) {
      Object.keys(parameters).forEach(function (key) {
        if (Array.isArray(parameters[key])) {
          parameters[key] = parameters[key].join(',');
        }

        if (!parameters[key] && typeof parameters[key] !== "number") {
          delete parameters[key];
        }
      });
      return url.format({
        query: parameters
      });
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content-getContent

  }, {
    key: 'getPage',
    value: function getPage(pageId, expand) {
      var _this = this;

      var uri = '/content/' + pageId;
      uri += this.createQueryString({
        expand: expand
      });
      return Promise.resolve().then(function () {
        return _this.GET(uri);
      });
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content/{id}/child-childrenOfType

  }, {
    key: 'getChildren',
    value: function getChildren(pageId) {
      var _this2 = this;

      var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          all = _ref3.all,
          _ref3$expand = _ref3.expand,
          expand = _ref3$expand === undefined ? [] : _ref3$expand;

      var uri = '/content/' + pageId + '/child/page';
      uri += this.createQueryString({
        expand: expand
      });
      return Promise.resolve().then(function () {
        if (!all) return _this2.GET(uri).then(function (body) {
          return body.results;
        });
        return _this2._getPagesAll(uri);
      });
    }
  }, {
    key: '_getPagesAll',
    value: function _getPagesAll(query) {
      var _this3 = this;

      var pages = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      console.log("gPA", query);
      return this.GET(query).then(function (body) {
        pages = pages.concat(body.results);
        if (!body._links.next) return pages;
        return _this3._getPagesAll(body._links.next, pages);
      });
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#space-contentsWithType

  }, {
    key: 'getPages',
    value: function getPages(spaceKey) {
      var _this4 = this;

      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { limit: 25, expand: [] };

      console.log("gp", opts);
      return Promise.resolve().then(function () {
        var query = '/space/' + spaceKey + '/content/page';
        if (!opts.all) return _this4.GET(query).then(function (body) {
          return body.results;
        });
        return _this4._getPagesAll(query + _this4.createQueryString({
          limit: opts.limit,
          expand: opts.expand
        }));
      });
    }
  }, {
    key: '_getSpacesAll',
    value: function _getSpacesAll(query) {
      var _this5 = this;

      var spaces = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      return this.GET(query).then(function (body) {
        spaces = spaces.concat(body.results);
        if (!body._links.next) return spaces;
        return _this5._getSpacesAll(body._links.next, spaces);
      });
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#space-spaces

  }, {
    key: 'getSpaces',
    value: function getSpaces() {
      var _this6 = this;

      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { limit: 25 };

      return Promise.resolve().then(function () {
        if (!opts.all) return _this6.GET('/space').then(function (body) {
          return body.results;
        });
        return _this6._getSpacesAll('/space' + _this6.createQueryString({
          limit: opts.limit
        }));
      });
    }
  }, {
    key: 'getSpace',


    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#d3e915
    value: function getSpace(spaceKey) {
      var _this7 = this;

      return Promise.resolve().then(function () {
        return _this7.GET('/space/' + spaceKey);
      });
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content-createContent

  }, {
    key: 'create',
    value: function create(_ref4) {
      var space = _ref4.space,
          title = _ref4.title,
          content = _ref4.content,
          parent = _ref4.parent;

      var body = {
        type: 'page',
        title: title,
        space: { key: space },
        body: {
          storage: {
            value: content,
            representation: 'storage'
          }
        }
      };
      if (parent) {
        body.ancestors = [{ id: parent }];
      }
      return this.POST('/content', body);
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content-update

  }, {
    key: 'update',
    value: function update(_ref5) {
      var space = _ref5.space,
          id = _ref5.id,
          title = _ref5.title,
          content = _ref5.content,
          parent = _ref5.parent,
          version = _ref5.version;

      var body = {
        type: 'page',
        title: title,
        space: { key: space },
        version: {
          number: version,
          minorEdit: false
        },
        body: {
          storage: {
            value: content,
            representation: 'storage'
          }
        }
      };
      if (parent) {
        body.ancestors = [{ id: parent }];
      }
      return this.PUT('/content/' + id, body);
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content-delete

  }, {
    key: 'del',
    value: function del(pageId) {
      return this.DEL('/content/' + pageId);
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content/{id}/label-addLabels

  }, {
    key: 'tagLabel',
    value: function tagLabel(pageId, label) {
      return this.POST('/content/' + pageId + '/label', [{ prefix: 'global', name: label }]);
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content/{id}/label-addLabels

  }, {
    key: 'tagLabels',
    value: function tagLabels(pageId, labels) {
      labels = labels.map(function (label) {
        return { prefix: 'global', name: label };
      });
      return this.POST('/content/' + pageId + '/label', labels);
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content/{id}/label-labels

  }, {
    key: 'getLabels',
    value: function getLabels(pageId) {
      return this.GET('/content/' + pageId + '/label').then(function (body) {
        return body.results;
      });
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content/{id}/label-deleteLabelWithQueryParam

  }, {
    key: 'untagLabel',
    value: function untagLabel(pageId, label) {
      return this.DEL('/content/' + pageId + '/label' + this.createQueryString({
        name: label
      }));
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content-search

  }, {
    key: 'search',
    value: function search(cql) {
      var _ref6 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          limit = _ref6.limit;

      var query = { cql: cql, limit: limit };
      return this.GET('/content/search' + url.format({ query: query })).then(function (body) {
        return body.results;
      });
    }

    // https://docs.atlassian.com/atlassian-confluence/REST/latest/#content-update

  }, {
    key: 'changeParent',
    value: function changeParent(pageId, parentId) {
      var _this8 = this;

      return this.getPage(pageId).then(function (page) {
        var body = {
          type: 'page',
          title: page.title,
          version: { number: page.version.number + 1 },
          ancestors: [{ type: 'page', id: parentId }]
        };
        return _this8.PUT('/content/' + pageId, body);
      });
    }

    // https://developer.atlassian.com/confdev/confluence-server-rest-api/confluence-rest-api-examples#ConfluenceRESTAPIExamples-Convertwikimarkuptostorageformat

  }, {
    key: 'convertWikiMarkup',
    value: function convertWikiMarkup(content) {
      return this.POST('/contentbody/convert/storage', {
        value: content,
        representation: "wiki"
      }).then(function (response) {
        return response.value;
      });
    }
  }]);

  return Confluency;
}();

exports.default = Confluency;