#!/usr/bin/env node

var SUB_PAGES_SIZE = 30;

var prompt = require('prompt'), 
  mongoose = require('mongoose'),
	NestedSetPlugin = require('mongoose-nested-set'),
	Schema = mongoose.Schema,
	async = require('async');

(function() {
  async.series([
    function(callback) {
      mongoose.connect('mongodb://localhost/nestedSet');
      callback();
    },
    function(callback) {
      UserSchema = new Schema({
        pageName: {type: String}
      });
      UserSchema.plugin(NestedSetPlugin);
      User = mongoose.model('User', UserSchema);
      callback();
    },
    function(callback) {
      var schema = {
          properties: {
            populate: {
              pattern: /^[a-zA-Z\s\-]+$/,
              message: 'Do you want to populate the database (Y/n)?',
              required: true
            }
          }
        };

      prompt.start();
      prompt.get(schema, function (err, result) {
        if(result.populate == "Y") {
          console.log("-------------------------------------------------");
          console.log("Populating.. Please wait..");

          var i;
          var localSubPages;
          var menuPages = new User({pageName: 'menu'});

          var pages = buildSubPageLayer("", menuPages, SUB_PAGES_SIZE);
          for (i = 0; i < SUB_PAGES_SIZE ; i++ ) {
            localSubPages = buildSubPageLayer(i+"_", pages[i], SUB_PAGES_SIZE);
            pages = pages.concat(localSubPages);

            for (j = 0; j < SUB_PAGES_SIZE ; j++ ) {
              localSubPages = buildSubPageLayer(i + "_" + j + "_", localSubPages[j], SUB_PAGES_SIZE);
              pages = pages.concat(localSubPages);
            }
          }
          pages.push(menuPages);
          
          async.each(
            pages
            , function(item, cb) { 
            item.save(cb); 
          },function(err){
            callback();
          });
        } else {
          callback();
        }
      });
    },
    function(callback) {
      console.log("-------------------------------------------------");
      console.log("Search for ancestors?");
      prompt.get(['ancestor', 'child'], function (err, result) {
        var t1 = process.hrtime();
        User.findOne({pageName: result.ancestor}, function(err, ancestor) {
          User.rebuildTree(ancestor, 1, function() {
            User.findOne({pageName: result.child}, function(err, child) {
              var t2 = process.hrtime();
              console.log(ancestor.isAncestorOf(child));
              console.log("Time needed: " + hrdiff(t1, t2) + " second(s)");
              callback();
            });
          });
        });
      });
    },
    function(callback) {
      console.log("-------------------------------------------------");
      console.log("selfAndAncestors should return all ancestors higher up in tree + current node");
      prompt.get(['ancestor', 'child'], function (err, result) {
        var t1 = process.hrtime();
        User.findOne({pageName: result.ancestor}, function(err, ancestor) {
          User.rebuildTree(ancestor, 1, function() {
            User.findOne({pageName: result.child}, function(err, child) {
              child.selfAndAncestors(function(err, people) {
                var t2 = process.hrtime();
                console.log(people);
                console.log("Time needed: " + hrdiff(t1, t2) + " second(s)");
                callback();
              });
            });
          });
        });
      });
    }
  ],
  function(err, results){
      mongoose.disconnect();
  });
})();


function buildSubPageLayer(subPageDepthName, parentPage, parentLayerSize) {
  var i;
  var subPages = Array();
  for (i = 0; i < parentLayerSize; i++) {
    subPages.push(new User({pageName: 'sub_page_' + subPageDepthName + i, parentId: parentPage._id}));
  }
  return subPages;
}

function hrdiff(t1, t2) {
  var s = t2[0] - t1[0];
  var mms = t2[1] - t1[1];
  return s + mms/1e9;
}