var assert = require('assert');
var request = require('request');
request._get = request.get
var triggerRequestError = null
var triggerRequestNoJSON = null
request.get = function (options, callback) {
  if (triggerRequestError) {
    callback(new Error('derp'))
    return triggerRequestError()
  }
  if (triggerRequestNoJSON) {
    callback(null, 'yoiks', null)
    return triggerRequestNoJSON()
  }
  request._get.apply(this, arguments)
}
var registry = require('../lib/registry');

describe('registry', function () {
    describe('split()', function () {
        it('should sanitize bad version data.', function () {
            var shelljs = require('./shelljs');

            assert.ok(shelljs.versions['0.0.1alpha1']);
            assert.ok(shelljs.versions['0.0.2pre1']);
            assert.ok(shelljs.versions['0.0.4pre1']);
            assert.ok(shelljs.versions['0.0.5pre1']);
            assert.ok(shelljs.versions['0.0.5pre2']);
            assert.ok(shelljs.versions['0.0.5pre3']);
            assert.ok(shelljs.versions['0.0.5pre4']);

            var results = registry.split(shelljs);

            assert.ok(results.json.versions['0.0.1-alpha1']);
            assert.ok(results.json.versions['0.0.2-pre1']);
            assert.ok(results.json.versions['0.0.4-pre1']);
            assert.ok(results.json.versions['0.0.5-pre1']);
            assert.ok(results.json.versions['0.0.5-pre2']);
            assert.ok(results.json.versions['0.0.5-pre3']);
            assert.ok(results.json.versions['0.0.5-pre4']);
        });
    });

    describe('get()', function () {
        it('should retrieve valid data from the default registry', function (done) {
            this.timeout(5000);

            registry.get({id: 'async'}, function (err, json, change) {
                assert.ok(!err);
                assert.equal(json.name, 'async');
                assert.deepEqual(change, {id: 'async'});
                done();
            });
        });

        it('failure retry', function (done) {
            this.timeout(5000);

            var triggeredError = false
            var triggeredNoJSON = false
            triggerRequestError = () => {
              triggeredError = true
              triggerRequestError = null
              triggerRequestNoJSON = () => {
                triggeredNoJSON = true
                triggerRequestNoJSON = null
              }
            }

            registry.get({id: 'async'}, function (err, json, change) {
              assert.ok(!err, 'should not error!');
              assert.equal(json.name, 'async');
              assert.deepEqual(change, {id: 'async'});
              assert.ok(triggeredError, 'sanity check error triggered')
              assert.ok(triggeredNoJSON, 'sanity check bad json triggered')
              done();
           });
        })
    });      
});

