:warning: *Use of this software is subject to important terms and conditions as set forth in the License file* :warning:

# Ticket to Help Center App

## Requires [Help Center API Beta Access](https://zendesk.wufoo.com/forms/help-center-api-beta-sign-up/)

## Description:

This App enables Agents to post public comments from Zendesk tickets as Articles in Help Center. The Agent has a chance to edit the HTML of the comment (including interpreted Markdown, if enabled on the account) before posting, choose the Section in which to post, choose the locale of the article, and choose whether or not it is a Draft, Promoted, or has Comments Disabled. The Agent can then View or Edit the Article in one click.

*Note that this differs from past Ticket to Web Portal functionality in that you must create the article before you can edit the content in the normal WYSIWYG editor (TinyMCE). I also created a version that can post the title and body content as parameters in the URL to be received by some custom JS on the Help Center create article page, but Help Center doesn't permit custom JS on the Admin pages so it doesn't function outside the JS console. This may change in the future and become an option.*

## App location:

* Ticket sidebar

## Features:

* Create Articles in Help Center from ticket comment HTML content (translated from Markdown if enabled)
* Choose a locale for the article from available locales (checks all Sections for existing locales)
* Choose whether or not the article should be a Draft (defaults to true)
* Choose whether or not the article should be Promoted (defaults to false)
* Choose whether or not the article should have Comments Disabled (defaults to false)

## Set-up/installation instructions:

Installation

1. Create the app with the zip file downloaded from this github page.
2. Browse the "Private App" section of the marketplace.
3. Click on the "Ticket to Help Center" app.


* **Restrict to Moderators:** If checked the App will only work for users with Help Center Moderator privileges.

## Contribution:

Pull requests are welcome, particularly to help refactor to improve performance, meet best practices, or implement the following planned features:
- set Labels on the Article
- pull ticket tags as Labels (optional setting)
- add an option to include Private comments in the list (and add UI differentiation for them)
- choose to post as a new translation for an existing article
- choose to post as a comment to an article or community post
- select multiple comments to include in the post
- use some sort of WYSIWYG editor for the HTML (limited by framework)
- choose the Author of the article (limited by API)


## Screenshot(s):
Default state.

![Imgur](http://i.imgur.com/Ugub0su.png)


List public comments.

![Imgur](http://i.imgur.com/DH2umGa.png)


Comments expand slightly and get 10% alpha Zendesk green when hovered-over.

![Imgur](http://i.imgur.com/BDX0A7c.png)


See the Title and HTML content of the article-to-be.

![Imgur](http://i.imgur.com/fXbr7Yx.png)


Edit the title from the placeholder default

![Imgur](http://i.imgur.com/ZU7RkOj.png)


Click 'Open Editor' to launch a larger editor in a modal. Copies changes already made in sidebar editor.

![Imgur](http://i.imgur.com/0wD2yka.png)


Click 'Next...' to finish editing and proceed to the options panel and choose a section, locale, and options.

![Imgur](http://i.imgur.com/iIdCjFY.png)


Click Post to Section to create the article in the selected section, then see the results.

![Imgur](http://i.imgur.com/ONQRLaB.png)


Click 'View' to see the article, or 'Edit' to open the editor, in Help Center.

![Imgur](http://i.imgur.com/vzNxIdo.png)


