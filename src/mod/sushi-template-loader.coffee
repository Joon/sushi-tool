async = require "async"
bower = require "bower"
fs    = require "fs-extra"
Git   = require "nodegit"
os    = require "os"
path  = require "path"
home  = os.homedir()
Multispinner = require "multispinner"
if (process.platform == 'win32') 
    tempalte_git_dir = "sushi_tool/template-git"
    template_dir = "sushi_tool/template"
else
    tempalte_git_dir = ".sushi-tool/template-git"
    template_dir = ".sushi-tool/template"
template_git_pwd = path.resolve(path.join(home, tempalte_git_dir))
template_pwd = path.resolve(path.join(home, template_dir))
prettyjson = require 'prettyjson'

gitRepository = "https://github.com/CoderDojo/sushi-gen"

downloadDependencies = (callback) ->
  # Execute bower
  config =
    cwd: template_git_pwd
  bower.commands.install([], {}, config)
  .on "end", ->
    callback()

module.exports =
  template_pwd: template_pwd
  symlink_folder: path.join(template_git_pwd, "public")
  isTemplateReady: ->
    fs.existsSync(template_git_pwd)

  updateTemplate: (callback) ->
    spinner = new Multispinner
      'bower_dependencies': __("pdf.bower_dependencies")

    async.series [
      (internalCallback) ->
        Git.Repository.open (template_git_pwd)
        .then (repository) ->
            repository.fetchAll()
            .then ->
                repository.mergeBranches("master", "origin/master")
                .then (oid) ->
                    internalCallback()
        .catch (e) -> 
            console.log "Error during GIT access: " + e
      , (internalCallback) ->
        downloadDependencies ->
            if !fs.existsSync template_pwd
                if process.platform == 'win32'
                    fs.copySync path.join(template_git_pwd, "public"), template_pwd
                else
                    fs.symlinkSync path.join(template_git_pwd, "public"), template_pwd
            if !fs.existsSync path.join(template_pwd, "_harp.json")
                if process.platform == 'win32'
                    fs.copySync(path.join(template_git_pwd, "harp.json"), path.join(template_pwd, "_harp.json"))
                else
                    fs.symlinkSync(path.join(template_git_pwd, "harp.json"), path.join(template_pwd, "_harp.json"))
            spinner.success('bower_dependencies')

        spinner.on 'done', =>
          callback()
          internalCallback()
    ]

  downloadTemplate: (callback) ->
    Git.Clone gitRepository, template_git_pwd, { checkoutBranch: "master" }
    .then (repository) ->
      callback()
    .catch (e) -> 
      console.log "Error during git clone: " + e
  prepareTemplateFolder: (externalCallback) ->
    async.series [
      (callback) =>
        if !@isTemplateReady()
          spinner = new Multispinner
            'git_download': __("pdf.download_template")

          @downloadTemplate ->
            spinner.success('git_download')
            callback()
        else
          callback()
      , (callback) =>
        @updateTemplate ->
          callback()
      , (callback) =>
        externalCallback()
        callback()
    ]
