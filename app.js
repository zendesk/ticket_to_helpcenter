(function() {
  return {
    // defaultState: 'default',
    events: {
      'app.created':'init',
      'click a.default':function(e) {
        if (e) { e.preventDefault(); }
        this.fetchComments();
      },
      'getComments.done':'renderComments',
      'getComments.fail':'getCommentsFail',
      'click li.to_article':'onCommentClick',
      'click li.to_comment':'onCommentToCommentClick',
      'getSections.fail':'getSectionsFail',
      'click #close_button':'copyModalContents',
      'click .done_editing_article':'onDoneEditingArticleClick',
      'click .done_editing_comment':'onDoneEditingCommentClick',
      'click .select_section':'onPostArticleClick',
      'postArticle.fail':'postArticleFail',
      'click .open_editor':'onOpenEditorClick',
      'click .back_to_comments':function(event) {
        this.ajax('getComments');
      },
      'click #modal_toggle':'showModal',
      'click .done':'init',

      'click .delete_article':'deleteArticle',
      'click .post_changes':'postChanges'
    },
    requests: {
      getComments: function() {
        return {
          url: helpers.fmt('/api/v2/tickets/%@/comments.json?sort_order=desc&include=users',this.ticket().id()),
          dataType: 'JSON',
          type: 'GET',
          proxy_v2: true
        };
      },
      getSections: function(html) {
        return {
          url: '/api/v2/help_center/sections.json?include=categories,translations',
          dataType: 'JSON',
          type: 'GET',
          proxy_v2: true
        };
      },
      postArticle: function (article, section) {
        return {
          url: helpers.fmt('/api/v2/help_center/sections/%@/articles.json',section),
          type: 'POST',
          dataType: 'JSON',
          contentType: 'application/JSON',
          data: article
        };
      },
      getRequirementField: function () {
        return {
          url: '/api/v2/apps/installations/' + this.installationId() + '/requirements.json', // this.installationId()
          dataType: 'JSON'
        };
      },
      getStoredArticle: function() {
        return {
          url: helpers.fmt('/api/v2/help_center/articles/%@.json', this.storedID),
          dataType: 'JSON'
        };
      },
      setField: function(articleURL) {
        var id = this.ticket().id();
        var rawData = {
          "ticket": {
            "custom_fields": [{ "id": this.URLFieldId, "value": articleURL }]
          }
        };
        var data = JSON.stringify(rawData);
        return {
          url: helpers.fmt('/api/v2/tickets/%@.json', id),
          type: 'PUT',
          dataType: 'JSON',
          contentType: 'application/JSON',
          data: data
        };
      },
      putChanges: function (article) {
        return {
          url: helpers.fmt('/api/v2/help_center/articles/%@.json', this.storedID),
          type: 'PUT',
          dataType: 'JSON',
          contentType: 'application/JSON',
          data: article
        };
      },
      putTranslation: function (translation) {
        return {
          url: helpers.fmt('/api/v2/help_center/articles/%@/translations/%@.json', this.storedID, this.locale),
          type: 'PUT',
          dataType: 'JSON',
          contentType: 'application/JSON',
          data: translation
        };
      },
      deleteArticle: function() {
        return {
          url: helpers.fmt('/api/v2/help_center/articles/%@.json', this.storedID),
          type: 'DELETE'
        };
      }
    },
    //named functions
    init: function(e) {
      if (e) { e.preventDefault(); }
      
      this.ajax('getRequirementField')
      .done(function(response){
        var requirements = response.requirements;
        this.URLFieldId = requirements[0].requirement_id;
        this.storedID = this.ticket().customField('custom_field_' + this.URLFieldId);
        // debugger;
        if(this.storedID) {
          // show the edit page with the value of that field
          // use a function and pass storedURL to it
          this.ifURLStored();
        } else {
          this.switchTo('default', {});
        }
      });
    },
    fetchComments: function() {
      this.ajax('getComments');
    },
    renderComments: function(data) {
      var comments = data.comments,
          users = data.users;
      _.each(comments, function(comment) {
        comment.created_at_local = new Date(comment.created_at).toLocaleString();
      });
      var no_html;
      if (this.postType == 'comment') {
        no_html = true;
      }
      if (comments.length == 1) {
        this.switchTo('edit_ticket_comment_to_article', {
          comment: comments[0].html_body,
          ticket_id: this.ticket().id()
        });
      } else {
        this.switchTo('comments', {
          comments: comments,
          users: users,
          no_html: no_html
        });
      }
    },
    onCommentClick: function(e) {
      if (e) { e.preventDefault(); }
      var id = e.currentTarget.children[1].id,
          innerHtml = e.currentTarget.children[1].innerHTML,
          comment = innerHtml,
          ticket_id = this.ticket().id();
      this.switchTo('edit_ticket_comment_to_article', {
          comment: comment,
          ticket_id: ticket_id
      });
    },
    onCommentToCommentClick: function(e) {
      if (e) { e.preventDefault(); }
      var id = e.currentTarget.children[2].id,
          innerHtml = e.currentTarget.children[2].innerHTML,
          comment = innerHtml,
          ticket_id = this.ticket().id();
      this.switchTo('edit_ticket_comment_to_comment', {
          comment: comment,
          ticket_id: ticket_id
      });
    },
    copyModalContents: function(e) {
      this.$("input.title").val(this.$("input#modal_title").val());
      this.$("textarea.show_comment").val(this.$("textarea#modal_content").val());
    },
    onDoneEditingArticleClick: function (e) {
      if (e) { e.preventDefault(); }
      this.ajax('getSections')
      .done(function(response){
        var sections = response.sections,
            categories = response.categories,
            translations = response.translations,
            locales_all = [];
        _.each(categories, function(category) {
          category.sections = [];
        });
        _.each(sections, function(section) {
          //add translation titles to sections
          _.each(section.translations, function(translation) {
            locales_all.push(translation.locale);
          });
          //add sections to categories
          var category = _.find(categories, function(obj) {
            return obj.id == section.category_id;
          });
          category.sections.push(section);
        });
        //get and process locales into array of unique values
        var locales = _.uniq(locales_all),
          force_draft = this.setting('force_draft');
        this.switchTo('article_options', {
          categories: categories,
          locales: locales,
          force_draft: force_draft
        });
      });
      if(e.currentTarget.id == "done_editing_modal") {
        this.title = this.$('input#modal_title').val();
        this.html = this.$('textarea#modal_content').val();
      } else {
        this.title = this.$('input.title').val();
        this.html = this.$('textarea.show_comment').val();
      }
    },
    onPostArticleClick: function(e) {
      if (e) { e.preventDefault(); }
      // gather field valudes
      var label_names = this.$('input.labels').val().split(/\W/),
        draft = this.$('input.draft').prop("checked"),
        promoted = this.$('input.promoted').prop("checked"),
        comments_disabled = this.$('input.comments_disabled').prop("checked"),
        locale = this.$('select.locale').val(),
        // since it is only placeholder text, and not a value, I had to add the following two lines to properly post the default title
        ticket_id = this.ticket().id(),
        default_title = helpers.fmt('From ticket #%@ via Outage Notification App', ticket_id),
        title = (this.title || default_title),
        html_single_quotes = this.html.replace(/"/gm, "'"), //replace double quotes with single quotes
        body = html_single_quotes.replace(/(\r\n|\n|\r)/gm," "), //remove line breaks
        //TODO: add the option to post a comment to an article, or an answer to a question
        article_data = {"article": {
          "label_names": label_names,
          // "draft": draft,
          "promoted": promoted,
          "comments_disabled": comments_disabled,
          "translations": [{"locale": locale, "title": title, "body": body, "draft": draft}]
        }},
        article = JSON.stringify(article_data),
        section = this.$('select.section').val();
      // field validation
      if(!section) {
        services.notify("No section specified. Please choose a section before submitting.", "error");
        return;
      }
      // field validation
      if(!locale) {
        services.notify("No locale specified. Please choose a locale before submitting.", "error");
        return;
      }
      // post the article
      this.ajax('postArticle', article, section)
      .done(function(response){
        var postedArticle = response.article;
        var storedURL = postedArticle.url;
        this.storedID = postedArticle.id;
        postedArticle.admin_url = postedArticle.html_url.replace(/hc\/(.*?)\//gi, "hc/admin/");
        postedArticle.edit_url = postedArticle.admin_url + helpers.fmt('/edit?translation_locale=%@', locale);
        services.notify(helpers.fmt("Success! Your outage has been posted to Help Center. Click the <a href='%@' target='blank'>edit link</a> to make changes.",postedArticle.edit_url));
        this.ajax('setField', this.storedID)
        .done(function() {
          this.switchTo('refresh');
        });

      });
    },
    showModal: function() {
      this.$("input#modal_title").val(this.$("input.title").val());
      this.$("textarea#modal_content").val(this.$("textarea.show_comment").val());
      this.$('#modal').modal('show');
    },
    ifURLStored: function() {
      this.ajax('getStoredArticle')
      .done(function(response) {
        var article = response.article;
        this.locale = article.locale;
        this.switchTo('edit_article', {
          article: article
        });
      });
    },
    postChanges: function(e) {
      if(e) {e.preventDefault();}

      var label_names = this.$('input.labels').val().split(/\W/),
        draft = this.$('input.draft').prop("checked"),
        promoted = this.$('input.promoted').prop("checked"),
        comments_disabled = this.$('input.comments_disabled').prop("checked"),
        article_data = {"article": {
          "label_names": label_names,
          // "draft": draft,
          "promoted": promoted,
          "comments_disabled": comments_disabled,
          "translations": [{"title": title, "body": body, "draft": draft}]
        }},
        article = JSON.stringify(article_data);
      // post the article
      this.ajax('putChanges', article)
      .done(function(response){
        console.log("Article Changes done");
      });
      var title = this.$('.title').val(),
        html_single_quotes = this.$('.body').val().replace(/"/gm, "'"), //replace double quotes with single quotes
        body = html_single_quotes.replace(/(\r\n|\n|\r)/gm," "), //remove line breaks
        translation_data = {"title": title, "body": body, "draft": draft},
        translation = JSON.stringify(translation_data);
      this.ajax('putTranslation', translation)
      .done(function(translation) {
        console.log("Translation Changes done");
        this.ifURLStored();
        services.notify("Success! Your outage post has been updated in Help Center.");
      });
    },
    deleteArticle: function(e) {
      if(e) {e.preventDefault();}
      // confirm("Delete the article?");
      this.ajax('deleteArticle')
      .done(function(response) {
        services.notify("Success! Your outage post has been deleted.");
        this.ajax('setField', '').done(function () {
          this.switchTo('refresh');
        });
      });
    },
    // error notifications
    getUserFail: function(data) {
      services.notify('Failed to get the current user for permission check. Please try reloading the app.', 'error');
    },
    getCommentsFail: function(data) {
      services.notify('Failed to get the comments for the current ticket. Please try reloading the app.', 'error');
    },
    getSectionsFail: function(data) {
      services.notify('Failed to get the available sections for the Help Center. Please try reloading the app.', 'error');
    },
    postArticleFail: function(data) {
      services.notify('Failed to post to Help Center. Please check that you have permission to create an article in the chosen section and try reloading the app.', 'error');
    },

    // #### Helpers
    paginate: function(a) {
      var results = [];
      var initialRequest = this.ajax(a.request, a.start, a.page);
      // create and return a promise chain of requests to subsequent pages
      var allPages = initialRequest.then(function(data){
        results.push(data[a.entity]);
        var nextPages = [];
        var pageCount = Math.ceil(data.count / 100);
        for (; pageCount > 1; --pageCount) {
          nextPages.push(this.ajax(a.request, a.start, pageCount));
        }
        return this.when.apply(this, nextPages).then(function(){
          var entities = _.chain(arguments)
                          .flatten()
                          .filter(function(item){ return (_.isObject(item) && _.has(item, a.entity)); })
                          .map(function(item){ return item[a.entity]; })
                          .value();
          results.push(entities);
        }).then(function(){
          return _.chain(results)
                  .flatten()
                  .compact()
                  .value();
        });
      });
      return allPages;
    }
  };
}());
