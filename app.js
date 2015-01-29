(function() {
  return {
    defaultState: 'default',
    events: {
      'click a.default':function(e) {
        if (e) { e.preventDefault(); }
        this.postType = 'article';
        this.ajax('getUser');
      },
      'click a.post_comment':function(e) {
        if (e) { e.preventDefault(); }
        // this.postType = 'comment';
        // this.ajax('getUser');
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
      // nav bar events
      'pane.activated':'onPaneActivated',

      'click li.tab':'onTabClicked',
      'click .imploded':'toggleRow',
      'click button.get_questions':'getHCquestions'
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
      },

      // nav bar requests
      getHCquestions: function (answered, next_page) {
        var accepted = '';
        if (answered == 'yes') {
          accepted = '&accepted=true';
        } else if (answered == 'no') {
          accepted = '&accepted=false';
        }
        if (next_page) {
          return {
            url: next_page + '&include=users,communities' + accepted,
            type: 'GET',
            success: function(response){this.gotHCQuestions(response, answered);}
          };
        } else {
          return {
            url: '/api/v2/help_center/questions.json?include=users,communities' + accepted, // add topics to sideload when implemented
            type: 'GET',
            success: function(response){this.gotHCQuestions(response, answered);}
          };
        }
      },
      getHCarticles: function (start) {
        if (start) {
          //if a start date (ms UTC) is passed...
          return {
            url: '/api/v2/help_center/incremental/articles.json?include=users,sections,translations&start_time=' + start,
            type: 'GET'
          };
        } else {
          return {
            url: '/api/v2/help_center/articles.json?include=users,sections,translations',
            type: 'GET'
          };
        }
        
      }
    },
    init: function(e) {
      if (e) { e.preventDefault(); }
      this.switchTo('default', {});
    },
    // load the navbar app if the pane is activated for the first time
    onPaneActivated: function(data) {
      if(data.firstLoad) {
        this.loadNavBar();

      }
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
      } else { this.ajax('getComments'); }
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
      console.log("No html? " + no_html);
      this.switchTo('comments', {
        comments: comments,
        users: users,
        no_html: no_html
      });
    },
    onCommentClick: function(e) {
      if (e) { e.preventDefault(); }
      //switch to the edit_ticket_comment_to_article template with the comment and sections
      console.log(e);
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
      //switch to the edit_ticket_comment_to_comment template with the comment and sections
      console.log(e);
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
    // onOpenEditorClick: function(e) {
    //   if (e) { e.preventDefault(); }
    //   var title = encodeURIComponent(this.$('input.title').val());
    //   var body = encodeURIComponent(this.$('textarea.show_comment').text());
    //   var url = helpers.fmt('https://joeshelpcenter.zendesk.com/hc/admin/articles/new?title=%@&body=%@',title,body);
    //   this.switchTo('editor_link', {
    //     url: url
    //   });
    // },
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
        services.notify(helpers.fmt("Success! Your article has been posted to Help Center. Click the <a href='%@' target='blank'>edit link</a> to make changes.",postedArticle.edit_url));
        this.switchTo('show_article', {
          article: postedArticle
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

    // #NAVBAR

    loadNavBar: function() {
      if (this.setting("restrict_to_moderators") === true) {
        var me = this.currentUser();
        if (me.moderator !== true) {
          services.notify('This app is restrcited to Moderators, and you are not one. Please check with an Admin about getting Moderator privileges.');
          return;
          // this.switchTo('nav_restricted')
        }
      }
      //TODO load the user's last tab choice from local storage, then load and select that

      this.switchTo('nav_home', {
      });
      this.$('div.app_frame').parents('.apps_nav_bar').css("padding", "0");
      // currently defaulting to questions via the following code
      this.getHCquestions();
    },
    onTabClicked: function(e) {
      if(e) {e.preventDefault();}
      var tab = e.currentTarget.id;
      console.log("Tab: " + tab);

      // select the clicked tab
      var selector = '#' + tab;
      this.$('li.tab').removeClass('active');
      this.$(selector).addClass('active');
      //this.progressBar('0');
      this.$('.questions_table').html('<div class="spinner dotted"></div>');

      // TODO: get the corresponding objects, the success of which should render and inject the content
      if (tab == 'questions') {
        // this.ajax('getHC' + tab);
        this.getHCquestions();
      } else if (tab == 'comments') {
        this.getHCcomments();
        this.$('.tab_content').html('<br><div class="alert alert-error"><b>Not yet supported</b><br> Only Questions are currently supported, sorry... &nbsp;&nbsp;As the API for Help Center develops so will this app.</div>');
      } else {
        // render an error whenever an unsupported tab is chosen
        this.$('.tab_content').html('<br><div class="alert alert-error"><b>Not yet supported</b><br> Only Questions are currently supported, sorry... &nbsp;&nbsp;As the API for Help Center develops so will this app.</div>');
      }
      // 
    },
    getHCcomments: function(e) {
      var startDate;
      if(e) {
        //function was called by click
        e.preventDefault();
        //gather filter inputs
          //get start date if one is set
      }
      var articles = this.paginate({
        request : 'getHCarticles',
        entity  : 'articles',
        start   : startDate,
        page    : 1
      });
      //since we're using paginate to call the AJAX requests we handle the response right here
      articles.done(_.bind(function(articles){
        if(articles.length !== 0) {
          // do something with articles
          console.log(articles);




        } else {
          // hide the loader and show an error
        }
      }, this));
    },
    getHCquestions: function(e) {
      var answered = this.store('answered_filter') || 'no'; // TODO make this a setting for default answered value
      if(e) { // if triggered by a button click (Get Questions)
        e.preventDefault();
        // gather the filter form inputs
        var answeredYes = this.$('input.answered_yes').prop("checked"),
          answeredNo = this.$('input.answered_no').prop("checked");
        if (answeredYes && answeredNo || !answeredYes && !answeredNo) {
          answered = 'both';
        } else if (answeredYes && !answeredNo) {
          answered = 'yes';
        } else if (!answeredYes && answeredNo) {
          answered = 'no';
        }
        // store the answered variable in localStorage for later retrieval
        this.store( 'answered_filter', answered );

      }
      // show the loading spinner
      this.$('.questions_table').html('<div class="spinner dotted"></div>');
      //this.progressBar('10');
      // make the request
      this.ajax('getHCquestions', answered);
    },
    gotHCQuestions: function(response, answered) {
      var questions = response.questions,
        communities = response.communities,
        users = response.users;
      var next_page = response.next_page;
      var last_page = response.previous_page;
      if (!next_page && !last_page) {
      // if this is the only page
        this.questions = questions;
        this.users = users;
        this.communities = communities;
          console.log("Only one page. Proceeding to process results.");
          this.renderHCquestions(answered);
      } else if (next_page && !last_page) {
      // if this is the first of multiple pages
        this.questions = questions;
        this.users = users;
        this.communities = communities;
          console.log("First of multiple. Getting next page: " + next_page);
        this.ajax('getHCquestions', answered, next_page); // get the next page

      } else if (next_page && last_page) {
      // if this is a middle page (not first, not last)
        console.log("This pages questions");
        console.log(questions);
        this.questions = this.questions.concat(questions);
        this.users = this.users.concat(users);
        this.communities = this.communities.concat(communities);
          console.log("Concantenated questions");
          console.log(this.questions);
          console.log("Middle page. Getting next page: " + next_page);
        this.ajax('getHCquestions', answered, next_page); // get the next page
        // return; // stop the function
      } else if (!next_page && last_page) {
      // if this is the last page
        this.questions = this.questions.concat(questions);
        this.users = this.users.concat(users);
        this.communities = this.communities.concat(communities);
          console.log(this.questions);
          console.log("Last page. Proceeding to process results.");
        this.renderHCquestions(answered);
      }
      
    },
    renderHCquestions: function(answered) {
      // once we've loaded the last page fill the local variables with the contents of the global
      var questions = this.questions;
      var users = _.uniq(this.users); // remove duplicates (sideloaded)
      var communities = _.uniq(this.communities); // remove duplicates (sideloaded)

      // process the response data into a format ready for Handlebars
      var singleCommunity = false;
      if (communities.length == 1) {
        singleCommunity = true;
      }
      var answeredYes,
        answeredNo;
      if (answered == 'yes') {
        answeredYes = true;
        answeredNo = false;
      } else if (answered == 'no') {
        answeredYes = false;
        answeredNo = true;
      } else {
        answeredYes = true;
        answeredNo = true;
      }
      var encodedQuestions = [];
      _.each(questions, function(question) {
        // format the dates
        question.created_at = new Date(question.created_at);
        question.created_at = question.created_at.toLocaleString();
        question.updated_at = new Date(question.updated_at);
        question.updated_at = question.updated_at.toLocaleString();
        // find the author name
        question.author = _.find(users, function(user) {
          if (user.id == question.author_id) {
            return true;
          }
        });
        // find the community name
        question.community = _.find(communities, function(community) {
          if (community.id == question.community_id) {
            return true;
          }
        });
        // NOTE topics are not yet sideloaded
        // also note: questions have an array of topics so this is a bit different that for authors and communities
        // question.topics = _.filter(topics, function(topic) {
        //   if (question.topic_ids.indexOf(topic.id) != -1) {
        //     return true;
        //   }
        // });
        // encode values for a CSV export
        var encodedQuestion = {
          id: question.id,
          title: encodeURIComponent(question.title),
          author: encodeURIComponent(question.author.name),
          accepted_answer_id: question.accepted_answer_id,
          community: encodeURIComponent(question.community.name),
          vote_sum: question.vote_sum,
          vote_count: question.vote_count,
          answer_count: question.answer_count,
          follower_count: question.follower_count,
          created_at: encodeURIComponent(question.created_at),
          updated_at: encodeURIComponent(question.updated_at),
          details: encodeURIComponent(question.details)
        };
        // push the encoded values to the array of encoded values
        encodedQuestions.push(encodedQuestion);
      }); //end each questions
      // render and inject the relevant tab content
      var html = this.renderTemplate('nav_HC_questions', {
        questions: questions,
        communities: communities,
        singleCommunity: singleCommunity,
        answeredYes: answeredYes,
        answeredNo: answeredNo,
        encodedQuestions: encodedQuestions
      });
      this.$('.tab_content').html(html); // inject rendered HTML
      this.$('#questions').addClass('active'); // make Questions the active tab
      this.$("[rel=tooltip]").tooltip({ placement: 'right'}); // enable right tooltips
      this.$("[rel=tooltip-left]").tooltip({ placement: 'left'}); // enable left tooltips
    },
    toggleRow: function(e) {

      var id = e.currentTarget.id;
      var implodedSelector = '#' + id;
      this.$(implodedSelector).toggleClass("selected_to_explode");
      var explodedSelector = '.' + id;
      this.$(explodedSelector).toggleClass("hidden");
    },


    // Helpers
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
