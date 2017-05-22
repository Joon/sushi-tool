(function() {
  var Git, Multispinner, async, bower, downloadDependencies, fs, gitRepository, home, os, path, prettyjson, tempalte_git_dir, template_dir, template_git_pwd, template_pwd;

  async = require("async");

  bower = require("bower");

  fs = require("fs-extra");

  Git = require("nodegit");

  os = require("os");

  path = require("path");

  home = os.homedir();

  Multispinner = require("multispinner");

  if (process.platform === 'win32') {
    tempalte_git_dir = "sushi_tool/template-git";
    template_dir = "sushi_tool/template";
  } else {
    tempalte_git_dir = ".sushi-tool/template-git";
    template_dir = ".sushi-tool/template";
  }

  template_git_pwd = path.resolve(path.join(home, tempalte_git_dir));

  template_pwd = path.resolve(path.join(home, template_dir));

  prettyjson = require('prettyjson');

  gitRepository = "https://github.com/CoderDojo/sushi-gen";

  downloadDependencies = function(callback) {
    var config;
    config = {
      cwd: template_git_pwd
    };
    return bower.commands.install([], {}, config).on("end", function() {
      return callback();
    });
  };

  module.exports = {
    template_pwd: template_pwd,
    symlink_folder: path.join(template_git_pwd, "public"),
    isTemplateReady: function() {
      return fs.existsSync(template_git_pwd);
    },
    updateTemplate: function(callback) {
      var spinner;
      spinner = new Multispinner({
        'bower_dependencies': __("pdf.bower_dependencies")
      });
      return async.series([
        function(internalCallback) {
          return Git.Repository.open(template_git_pwd).then(function(repository) {
            return repository.fetchAll().then(function() {
              return repository.mergeBranches("master", "origin/master").then(function(oid) {
                return internalCallback();
              });
            });
          })["catch"](function(e) {
            return console.log("Error during GIT access: " + e);
          });
        }, function(internalCallback) {
          downloadDependencies(function() {
            if (!fs.existsSync(template_pwd)) {
              if (process.platform === 'win32') {
                fs.copySync(path.join(template_git_pwd, "public"), template_pwd);
              } else {
                fs.symlinkSync(path.join(template_git_pwd, "public"), template_pwd);
              }
            }
            if (!fs.existsSync(path.join(template_pwd, "_harp.json"))) {
              if (process.platform === 'win32') {
                fs.copySync(path.join(template_git_pwd, "harp.json"), path.join(template_pwd, "_harp.json"));
              } else {
                fs.symlinkSync(path.join(template_git_pwd, "harp.json"), path.join(template_pwd, "_harp.json"));
              }
            }
            return spinner.success('bower_dependencies');
          });
          return spinner.on('done', (function(_this) {
            return function() {
              callback();
              return internalCallback();
            };
          })(this));
        }
      ]);
    },
    downloadTemplate: function(callback) {
      return Git.Clone(gitRepository, template_git_pwd, {
        checkoutBranch: "master"
      }).then(function(repository) {
        return callback();
      })["catch"](function(e) {
        return console.log("Error during git clone: " + e);
      });
    },
    prepareTemplateFolder: function(externalCallback) {
      return async.series([
        (function(_this) {
          return function(callback) {
            var spinner;
            if (!_this.isTemplateReady()) {
              spinner = new Multispinner({
                'git_download': __("pdf.download_template")
              });
              return _this.downloadTemplate(function() {
                spinner.success('git_download');
                return callback();
              });
            } else {
              return callback();
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            return _this.updateTemplate(function() {
              return callback();
            });
          };
        })(this), (function(_this) {
          return function(callback) {
            externalCallback();
            return callback();
          };
        })(this)
      ]);
    }
  };

}).call(this);
