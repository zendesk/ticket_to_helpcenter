(function() {
  return {
    defaultState: 'default',
    events: {
      'click a.default':function(e) {
        if (e) { e.preventDefault(); }
        this.postType = 'article';
        this.ajax('getUser');
        this.segment.identifyAndGroup();
        this.segment.track('HC | Post Article: initiated');
      },
      'click a.post_comment':function(e) {
        if (e) { e.preventDefault(); }
        // this.postType = 'comment';
        // this.ajax('getUser');
        this.segment.identifyAndGroup();
        this.segment.track('HC | Post Comment: initiated');
      },
      'getUser.done':'fetchComments',
      'getUser.fail':'getUserFail',
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

      // include the segment module on app.created
      'app.created':function() {
        var Segment = require('segment/segment.js');
        this.segment = new Segment(this);
      },
    },
    requests: {
      // segment requests
      identify: function(user) {
        return this.segment.identifyReq(user);
      },
      group: function(group) {
        return this.segment.groupReq(group);
      },
      track: function(event) {
        return this.segment.trackReq(event);
      },
      // end segment requests
      getUser: function() {
        return {
          url: '/api/v2/users/me.json',
          dataType: 'JSON',
          type: 'GET',
          proxy_v2: true
        };
      },
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
      }
    },
    init: function(e) {
      if (e) { e.preventDefault(); }
      this.switchTo('default', {});
    },
    fetchComments: function(data) {
      var currentUser = data.user;
      if (this.setting("restrict_to_moderators") === true) {
        console.log('App is restricted to moderators');
        if (currentUser.moderator === true) {
          this.ajax('getComments');
        } else {
          services.notify('This app is currently restricted to moderators and you are not one. Please contact your Zendesk admin to get moderator privileges or get the app unrestricted.', 'error');
        }
      } else {
        this.ajax('getComments');
      }
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
      this.switchTo('comments', {
        comments: comments,
        users: users,
        no_html: no_html
      });
    },
    onCommentClick: function(e) {
      if (e) { e.preventDefault(); }
      //switch to the edit_ticket_comment_to_article template with the comment and sections
      // console.log(e);
      var id = e.currentTarget.children[1].id,
          innerHtml = e.currentTarget.children[1].innerHTML,
          comment = innerHtml,
          ticket_id = this.ticket().id();
      this.switchTo('edit_ticket_comment_to_article', {
          comment: comment,
          ticket_id: ticket_id
      });
      this.segment.track('HC | Post Article: comment selected');
    },
    onCommentToCommentClick: function(e) {
      if (e) { e.preventDefault(); }
      //switch to the edit_ticket_comment_to_comment template with the comment and sections
      // console.log(e);
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
        //TODO also get the available labels and then call jquery UI's autocomplete (or similar)
        //  /api/v2/help_center/articles/labels.json
      });
      if(e.currentTarget.id == "done_editing_modal") {
        this.title = this.$('input#modal_title').val();
        this.html = this.$('textarea#modal_content').val();
      } else {
        this.title = this.$('input.title').val();
        this.html = this.$('textarea.show_comment').val();
      }
      this.segment.track('HC | Post Article: show article options');
    },
    onDoneEditingCommentClick: function (e) {
      //TODO change this so it works for comments rather than articles
      if (e) { e.preventDefault(); }
      this.ajax('getHCarticles')
      .done(function(response){
        var articles = response.articles,
            sections = response.sections,
            translations = response.translations;
        _.each(articles, function(article) {
          //add translations and locales to articles
          article.translations = [];
          article.locales = [];
          _.each(article.translation_ids, function(id) {
            var translation = _.find(translations, function(obj) {
              return obj.id == id;
            });
            article.translations.push(translation);
            article.locales.push(translation.locale);
          });
        });
        _.each(sections, function(section) {
          //add articles to sections
          section.articles = _.filter(articles, function(article) {
            return article.section_id == section.id;
          });
          section.translations = [];
          section.locales = [];
          // add translations and locales to sections
          _.each(section.translation_ids, function(id) {
            var translation = _.find(translations, function(obj) {
              return obj.id == id;
            });
            section.translations.push(translation);
            section.locales.push(translation.locale);
          });
        });
        this.switchTo('comment_options', {
          sections: sections
        });

        //TODO also get the available labels and then call jquery UI's autocomplete (or similar)
        //  /api/v2/help_center/articles/labels.json  
      });
      if(e.currentTarget.id == "done_editing_modal") {
        this.html = this.$('textarea#modal_content').val();
      } else {
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
        default_title = helpers.fmt('From ticket #%@ via Ticket to Help Center App', ticket_id),
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
        postedArticle.admin_url = postedArticle.html_url.replace(/hc\/(.*?)\//gi, "hc/admin/");
        postedArticle.edit_url = postedArticle.admin_url + helpers.fmt('/edit?translation_locale=%@', locale);
        services.notify(helpers.fmt("Success! Your outage has been posted to Help Center. Click the <a href='%@' target='blank'>edit link</a> to make changes.",postedArticle.edit_url));
        this.switchTo('show_article', {
          article: postedArticle
        });
      });
      this.segment.track('HC | Post Article: article posted',{'label_names': label_names,'draft': draft,'promoted': promoted,'comments_disabled': comments_disabled,'locale': locale,'title': title});
    },
    showModal: function() {
      this.$("input#modal_title").val(this.$("input.title").val());
      this.$("textarea#modal_content").val(this.$("textarea.show_comment").val());
      this.$('#modal').modal('show');
      this.segment.track('HC | show modal');
    },
    getUserFail: function(data) {
      services.notify('Failed to get the current user for permission check. Please try reloading the app.', 'error');
      this.segment.track('HC | Error: get user failed', {'error':data});
    },
    getCommentsFail: function(data) {
      services.notify('Failed to get the comments for the current ticket. Please try reloading the app.', 'error');
      this.segment.track('HC | Error: get comments failed', {'error':data});
    },
    getSectionsFail: function(data) {
      services.notify('Failed to get the available sections for the Help Center. Please try reloading the app.', 'error');
      this.segment.track('HC | Error: get sections failed', {'error':data});
    },
    postArticleFail: function(data) {
      services.notify('Failed to post to Help Center. Please check that you have permission to create an article in the chosen section and try reloading the app.', 'error');
      this.segment.track('HC | Error: post article failed', {'error':data});
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
    },
    progressBar: function(percent) {
      var html = helpers.fmt('<div class="progress progress-success progress-striped"><div class="bar" style="width: %@%"></div></div>', percent);
      this.$('.tab_content').html(html);
    }
  };
}());
