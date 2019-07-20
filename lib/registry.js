/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License.
See LICENSE file.
*/

var request = require('request');
var url = require('url');
var config = require('./config.json');
var normalize = require('normalize-registry-metadata');

function getDoc(change, callback, retries = 0) {
    var opt = {
        url: url.format({
            protocol: config.protocol,
            hostname: config.registry,
            pathname: change.id
        }),
        json: true,
        headers: {
            'user-agent': config.ua
        }
    };
    request.get(opt, function(err, res, json) {
        if ((err || !json) && retries < config.maxRetries) {
            var backoff = Math.pow(10, retries + 1)
            return setTimeout(getDoc.bind(null, change, callback, retries + 1), backoff);
        }
        if (err) {
            console.error(err);
            return callback(err, json, change);
        }

        callback(null, json, change);
    });
}
exports.get = getDoc;

function splitVersions(json) {
    var parts = [];

    function addVersionAs(name, version) {
        var versionJson = json.versions[version];
        if (typeof versionJson === 'undefined') {
            return;
        }
        parts.push({
            version: name,
            json: JSON.parse(JSON.stringify(versionJson))
        });
    }

    if (json['dist-tags']) {
        Object.keys(json['dist-tags']).forEach(function(name) {
            var tag = json['dist-tags'][name];
            addVersionAs(name, tag);
        });
    }
    if (json.versions) {
        Object.keys(json.versions).forEach(function(name) {
            addVersionAs(name, name);
        });
    }
    return parts;
}

function splitTarballs(doc) {
    return doc.versions ? Object.keys(doc.versions).map(function(v) {
        var item = doc.versions[v];
        return {
            path: url.parse(item.dist.tarball).pathname,
            tarball: item.dist.tarball,
            shasum: item.dist.shasum
        };
    }) : [];
}


function split(doc) {
    normalize(doc);
    return {
        json: doc,
        versions: splitVersions(doc),
        tarballs: splitTarballs(doc)
    };
}

exports.split = split;
