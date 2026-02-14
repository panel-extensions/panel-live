# Issues

## Enable org mode in MkDocs

To better enable using "python" as the name for code-blocks we should enable a mkdocs mode or "org" (for original or "code", "default", or similar):

```{.panel mode="org" theme="dark" height="500px"}
import panel as pn
pn.panel("Hello").servable()
```

The above would just insert the rendered code block format by pymdownx.superfences.

## Enable rendered mode in mkdocs

The better enable replacing existing Panel pyodide integration in Panels docs we should support a "render" mode (or "compile", "save", or similar name") which renders/ saves to html.

```{.panel mode="org" theme="dark" height="500px"}
import panel as pn
pn.panel("Hello").servable()
```

Maybe it embeds directly into the document. Maybe it renders into an iframe (tbd)

We should ensure the render is fast (or maybe even done in parallel. or reusing previously rendered output? Maybe the rendered output is in a file that is just loaded via src into frame

We would need an analysis and maybe some experiments to learn how to best do this.

The current way for Panel and HoloViz to embed via pyodide is in https://github.com/holoviz-dev/nbsite/tree/main/nbsite/pyodide

## Release panel-live assets versioned

It should be possible to load versioned versions of the panel-live assets (including mini-coi.js and other assets) instead of just latest to ensure reproducibility.

## VS Code Shortcuts

In the editor and playground we would love to have VS Code like editor short cuts to speed up working with the code.

## Crash only on my windows laptop

I've tested panel live on ios tablet, ios iPhone and my wifes windows laptop. In all places it works just fine. I.e. the one place I can reproduce the crashing is on my window laptop in edge/ chrome. The existing issue should be updated with this information.

We should also relax the crash message in README.md and index.md to mention that it crashes for some users of edge/ chrome and that in those cases Firefox has been reported to work.

## Latex Example

We should add a panel latex example to the examples section

## Panel Playground - Exiting Example

The Panel Playground should have a more exiting default example. Something that says welcome to Panel Playground. Provides a link to to the panel-live documentation and displays something interactive that is useful to users, easy to understand and looks awesome.

## Panel-Live link

Maybe it would be useful for users to provide a link to panel-live docs from the panel editor and panel playground

## Example Kpi dashboard

The "Quarterly target" text takes up too much space. Change it to "Target".

## Example Streaming Random Walk

Nothing happens when I uncheck the follow checkbox. Please explain what is expected to happen and fix if there is a bug. If possible add a tooltip to explain what is expected when you check/ uncheck the follow checkbox.

##  LLMs Should understand the page

Please verify that you as an LLM can understand a page like https://panel-extensions.github.io/panel-live/examples/ including discovering the code examples. Please verify by fetching the page and analyzing it. Identify things that can make it easier to understand and plan how to implement them. Discuss with the user before implementing.

## Matplotlib Example

Still takes up too much space.

A screenshot can be taken from https://panel-extensions.github.io/panel-live/examples/#matplotlib-no-panel to better understand this.

## Run makes panel-live Flickr

When I click the run button on an editor it looks like panel-live Flickrs. The cause is that a spinner and "running" message is inserted/ displayed at the top for a short period of time. This move the rest of the content down and back up when running is finished. It would probably be a better ux if the spinner + message was shown on top of the output instead.

## Example DeckGL

The DeckGL example is not very realistic or appealing. Deck.gl can appear more more interesting and interactive. Please improve the example as much as possible while still making it short enough for users to understand/ start from.

## Panel Docs

The panel docs at https://panel.holoviz.org/how_to/wasm/index.html# should link to panel-live. It should recommend this as the easiest, most powerful and recommended option.

## Language Server

It would be really awesome if the editor could provide/ work with a language server to provide tooltips, tab-completion and inline error messages.

## Autoformatting

It would be really awesome if the editor could provide autoformatting for example via black or ruff.

## Example Mini Calculator/ Unit Converter

Dropdown widgets does not provide a great ux when there are only a few options to pick from. Radiobuttons or ButtonRadioButtonGroups provide a better user experience.

Please improve the user experience by selecting the optimal widgets and layout this out into a natural but compact flow.

## Mini-Coi in MkDocs

I think we learned to use Mini-Coi in a different way than what's currently described in the mkdocs-integration document. I also think we updated mini-coi js to fix a bug. Please update the mkdocs-integration document accordingly.

If we have found a bug we should report this back to mini-coi.js. Please formulate an issue in a separate mini-coi-issue.md document.

## Web component syntax

For example in the mode document we are not showing the panel-live web component syntax. Only the fence syntax.

We should find a way to systematically communicate the panel-live web component syntax across the HTML Attributes and wider how-to guides to make it easy for users to understand. It also works as a quick manual test for developers.

## Is label best name for pill text?

Is the label name the right/ best name for the pill text?

Do users understand it?
Is it future proof if we in the future would like to add a very short supplementary text with a name or description of the app?

## LLM Editing Support

It would be cool if it was possible in editor or playground to be AI assisted via chat interface and for example web-llm when editing the code.

## Support src GitHub url

A GitHub url like https://github.com/panel-extensions/panel-live/blob/main/docs/assets/examples/bokeh-scatter.py should also be allowed even though I believe it returns a html document and not a .py text file.

## HTML Attributes Examples

For example examples-src page lacks rendered panel-live examples. We should systematically ensure that across the How to Guides we render panel-live components to show users how this looks. This also is also very useful for developers to quickly test if everything is working as expected.

## Panel Live Skill

We should develop and supply panel-live skills according to best practices https://github.com/anthropics/skills/tree/main/skills/skill-creator. The purpose is to make it easy for users of panel-live and llms to use panel-live.

## Add Data Viz Examples

We should add a seaborn and a plotnine example.

## Demonstrate that things work

For example in https://panel-extensions.github.io/panel-live/how-to/multi-file-apps/?h=multi#loading-files-from-urls the examples are only indicative

Its using urls that don't exist and no panel-live elements are rendered providing that this in fact works.

All of this makes it harder for users to replicate and understand.

## Systematically Test the Documentation

We should have you (the LLM) systematically test every page in the documentation:

- Make sure its understandable for human and LLM users. Fix issues
- Make sure every code example is a minimum, reproducible example at best or if only indicative can easily be extended to a working example.

This can be systematically tested by creating .html test examples and using playwright or other tool to test its working.

Any problems identified should be listed, fixed and tested that the fix works. The documentation should be updated accordingly.

## CSS Custom Properties

Another example of a page that does not display effects. I.e. there are not panel-live elements rendered. We should rendered elements to demonstrate effect when ever possible - systematically across the documentation.

## how-to/events/ is not styling

The how-to/events/ page is under styling in the menu. That is not the correct place.

It is also only indicative and lacks working e2e example(s) for reproducibility.

## Python API

panel_live.fences is probably not best name. It does not indicate that this is relevant for mkdocs/ pymdownx.superfences only. We need a plan for mkdocs, sphinx, quarto etc. functionality. Then we need the namespaces and documentation updated.

## Design Decisions - Competitors

Since we are an open source, friendly project its better to use the term "data app alternatives" or similar instead of more aggressive "competitors". Please update.

## Share Gist

We should make it easy to share panel-live via a link to a gist similarly to how shiny live enables this https://shiny.posit.co/py/get-started/shinylive.html.

## Create/ Export

We should make it easy for users to create and export panel-live apps similarly to how shiny live enables this https://shiny.posit.co/py/get-started/shinylive.html.

## Add more friendly Examples

We should add more examples: xarray, polars, duckdb, sqlite

Maybe the non-holoviz examples should go to their own subpages of the examples? To reduce the load time and resource usage. To enable adding more specific examples using that framework?

## Make Sure Playground API is extensible

Maybe over time the playground should expand it a full fletched editor environment similarly to shine-live or code sandbox.

I would like it to be as simple for users to use and I believe that is focusing on a single file. But maybe in the future it should embed a js console, python terminal, multi-file support including css/ js.

For now we should just review the playground api, documentation and implementation to ensure we can extend this if needed one day.

## Best of MUI Editor

If you compare to the code-editor in https://mui.com/material-ui/react-button/ then instead of "<> Code" it uses "Expand Code", "Collapse Code" button text. That is much more user friendly.

Furthermore  it keeps the button in the same place when clicked. Our behaviour moves the button up or down. I think the mui behaviour is more user friendly.

The mui editor also has a great tooltip "Copy the source" and icon.

The mui editor also has a useful "reset" button with a "Reset demo" tooltip.

The mui editor as has a nice button menu with "View the source on GitHub", "Copy link to Javascript source", "Copy link to Typescript source" actions.

We should analyze the MUI editor and take the best features from it.

## Make it easy to embed via iframe

We should ensure its easy to embed (via iframe) to a running example app, editor or playground. And this should be documented.

## Embed in Discourse

It would be really, really nice if it was possible to embed either the web-component or via iframe example apps, editors and playground in Discourse in general and https://discourse.holoviz.org/ specifically. This should be tested. If special enablement/ configuration by the discourse site is necessary then document how to do this.

If this is not safe/ secure to enable then please explain why.

## Sharing Strategy

We simply need a strategy for sharing. I.e. for official links to app, editor and playground.

- Where? Panel website or panel-live website. Which url
- Reproducible? How to keep this reproducible and working. By experience as soon as versions of pyodide, panel, bokeh and other dependencies change examples that used to work no longer works.

## Reproducibility

Enable loading specific version of app, editor or playground and or pyodide, bokeh, panel etc. versions for reprodubility. Via query arguments? Via script meta data as according to pep0723?

## Inline Meta Data

Would it be easier to support inline meta data pep0723 https://peps.python.org/pep-0723/. This could give some of the reproducibility as well as a simple way of distributing.
