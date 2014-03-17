(function() {
  return {
    defaultState: 'default',
    events: {
      'click .default':function(e) {
        if (e) { e.preventDefault(); }
        this.ajax('getUser');
      },
      'getUser.done':'fetchComments',
      'getUser.fail':'getUserFail',
      'getComments.done':'renderComments',
      'getComments.fail':'getCommentsFail',
      'click li.comment':'onCommentClick',
      'getSections.fail':'getSectionsFail',
      'click #close_button':'copyModalContents',
      'click .done_editing':'onDoneEditingClick',
      'change #section_select':'onSectionSelected',
      'click .select_section':'onPostClick',
      'postArticle.fail':'postArticleFail',
      'click .open_editor':'onOpenEditorClick',
      'click .back_to_comments':function(event) {
        this.ajax('getComments');
      },
      'click #modal_toggle':'showModal',
      'click .done':'init'
    },
    requests: {
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
          proxy_v2: true,
          data: article
        };
      }
    },
    init: function() {
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
        // console.log(comment.created_at_local);
      });
      this.switchTo('comments', {
        comments: comments,
        users: users
      });
    },
    onCommentClick: function(e) {
      if (e) { e.preventDefault(); }
      //get available sections, and when that finishes switch to the show_comment template with the comment and sections
      // console.log(e.currentTarget.children[1]);
      var id = e.currentTarget.children[1].id,
          innerHtml = e.currentTarget.children[1].innerHTML,
          comment = innerHtml,
          ticket_id = this.ticket().id();
      this.switchTo('show_comment', {
          comment: comment,
          ticket_id: ticket_id
      });
    },
    copyModalContents: function(e) {
      this.$("input.title").val(this.$("input#modal_title").val());
      this.$("textarea.show_comment").val(this.$("textarea#modal_content").val());
    },
    onDoneEditingClick: function (e) {
      if (e) { e.preventDefault(); }
      this.ajax('getSections')
      .done(function(response){
        var sections = response.sections,
            categories = response.categories,
            translations = response.translations,
            locales_all = [];
        _.each(categories, function(category) {
           category.sections = [];
          //add category titles to categories
          category.translations = [];
          _.each(category.translation_ids, function(id) {
            var translation = _.find(translations, function(obj) {
              return obj.id == id;
            });
            category.translations.push(translation);
            // console.log("Category translations: " + translation.title);
          });
        });
        _.each(sections, function(section) {
          //add translation titles to sections
          section.translations = [];
          _.each(section.translation_ids, function(id) {
            var translation = _.find(translations, function(obj) {
              return obj.id == id;
            });
            section.translations.push(translation);
            console.log(section.translations);
            console.log(translation.locale);
            locales_all.push(translation.locale);

            
          });
          //add sections to categories
          var category = _.find(categories, function(obj) {
            return obj.id == section.category_id;
          });
          category.sections.push(section);
          // console.log(category.sections);
        });
        //get and process locales into array of unique values
        console.log(locales_all);
        var locales = _.uniq(locales_all);
        console.log(locales);

        this.switchTo('article_options', {
          categories: categories,
          locales: locales
        });
        
      });
      console.log(e);
      if(e.currentTarget.id == "done_editing_modal") {
        this.title = this.$('input#modal_title').val();
        this.html = this.$('textarea#modal_content').val();
      } else {
        this.title = this.$('input.title').val();
        this.html = this.$('textarea.show_comment').val();
      }
    },
    onSectionSelected: function(e) {
      //this isn't getting called yet
      // console.log("clicked an option");
      this.$(".select_section").disabled = false;
      this.$(".select_section").removeClass("disabled");
    },
    // onOpenEditorClick: function(e) {
    //   if (e) { e.preventDefault(); }
    //   var title = encodeURIComponent(this.$('input.title').val());
    //   var body = encodeURIComponent(this.$('textarea.show_comment').text());
    //   var url = helpers.fmt('https://joeshelpcenter.zendesk.com/hc/admin/articles/new?title=%@&body=%@',title,body);
    //   this.switchTo('editor_link', {
    //     url: url
    //   });
    // },
    onPostClick: function(e) {
      if (e) { e.preventDefault(); }
      var labels = '[]',
          draft = this.$('input.draft').prop("checked"),
          promoted = this.$('input.promoted').prop("checked"),
          comments_disabled = this.$('input.comments_disabled').prop("checked"),
          locale = this.$('select.locale').val(), //or a setting for the default locale
          ticket_id = this.ticket().id(),
          default_title = helpers.fmt('From ticket #%@ via Ticket to Help Center App', ticket_id),
          title = (this.title || default_title),
          html_single_quotes = this.html.replace(/"/gm, "'"),
          body = html_single_quotes.replace(/(\r\n|\n|\r)/gm," "), //remove line breaks
          article = helpers.fmt(
            '{"article": {"labels": %@,  "draft": %@, "promoted": %@, "comments_disabled": %@, "translations": [{"locale": "%@", "title": "%@", "body": "%@"}]}}',
            labels,draft,promoted,comments_disabled,locale,title,body),
          section = this.$('select.section').val();
      this.ajax('postArticle', article, section)
      .done(function(response){
        var postedArticle = response.article,
            translations = response.translations;
        // console.log("Base URL: " + postedArticle.html_url);
        postedArticle.admin_url = postedArticle.html_url.replace(/hc\/(.*?)\//gi, "hc/admin/");
        postedArticle.edit_url = postedArticle.admin_url + helpers.fmt('/edit?translation_locale=%@', locale);
        // console.log("Admin URL: " + postedArticle.admin_url);
        services.notify(helpers.fmt("Success! Your article has been posted to Help Center. Click the <a href='%@' target='blank'>edit link</a> to make changes.",postedArticle.edit_url));
        this.switchTo('show_article', {
          article: postedArticle,
          translations: translations
        });
      });
    },
    showModal: function() {
      this.$("input#modal_title").val(this.$("input.title").val());
      this.$("textarea#modal_content").val(this.$("textarea.show_comment").val());
      this.$('#modal').modal('show');
    },
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
  };
}());
